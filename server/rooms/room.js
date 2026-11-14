import { randomBytes } from 'node:crypto';
import { ALLOWED_EXTEND_MS, FIXED_DURATIONS, MAX_PHASE_EXTENDS, MAX_PLAYERS, MIN_PLAYERS, PHASES } from '../engine/constants.js';
import { act, createGame, endPhase, isPhaseComplete } from '../engine/game.js';
import { defaultSettings, mergeSettings, validateSettings } from '../engine/settings.js';
import { viewFor } from '../views/viewFor.js';
import { canRead, channelForSender } from './chat.js';

const EARLY_CLOSE_MS = 1200; // grace period after everyone has acted
const DISCONNECT_GRACE_MS = 60_000;
const MAX_CHAT = 200;
const MAX_PAUSE_MS = 5 * 60_000; // auto-resume so a host can't stall the game forever

const id = (bytes = 4) => randomBytes(bytes).toString('hex');

export function cleanName(raw) {
  return String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, 20);
}

export class Room {
  /** opts.timeScale shrinks every phase clock (used by tests). */
  constructor(io, code, opts = {}) {
    this.io = io;
    this.code = code;
    this.timeScale = opts.timeScale ?? 1;
    this.players = []; // { id, name, token, socketId, connected }
    this.hostId = null;
    this.settings = defaultSettings();
    this.game = null;
    this.deadline = null;
    this.timer = null;
    this.paused = false;
    this.pausedRemainingMs = null;
    this.extendCount = 0;
    this.pauseWatchdog = null;
    this.hostMuted = new Set();
    this.chat = [];
    this.lastActive = Date.now();
    this.disconnectTimers = new Map();
  }

  // ---------- membership ----------

  addPlayer(rawName) {
    if (this.game) return { error: 'The game has already started.' };
    if (this.players.length >= MAX_PLAYERS) return { error: 'The room is full.' };
    const name = cleanName(rawName);
    if (!name) return { error: 'Enter a name.' };
    if (this.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      return { error: 'That name is already taken in this room.' };
    }
    const player = { id: id(4), name, token: id(16), socketId: null, connected: false };
    this.players.push(player);
    if (!this.hostId) this.hostId = player.id;
    this.touch();
    return { player };
  }

  byToken(token) {
    return this.players.find((p) => p.token === token);
  }

  byId(pid) {
    return this.players.find((p) => p.id === pid);
  }

  attach(player, socketId) {
    clearTimeout(this.disconnectTimers.get(player.id));
    this.disconnectTimers.delete(player.id);
    player.socketId = socketId;
    player.connected = true;
    this.touch();
  }

  detach(player) {
    player.connected = false;
    player.socketId = null;
    clearTimeout(this.disconnectTimers.get(player.id));
    this.disconnectTimers.set(
      player.id,
      setTimeout(() => this.dropAfterGrace(player.id), DISCONNECT_GRACE_MS * this.timeScale),
    );
    this.broadcast();
  }

  dropAfterGrace(pid) {
    this.disconnectTimers.delete(pid);
    const p = this.byId(pid);
    if (!p || p.connected) return;
    if (!this.game) this.removePlayer(pid);
    else if (pid === this.hostId) this.transferHost();
    this.broadcast();
  }

  removePlayer(pid) {
    this.players = this.players.filter((p) => p.id !== pid);
    this.hostMuted.delete(pid);
    if (pid === this.hostId) this.transferHost();
  }

  transferHost() {
    const next = this.players.find((p) => p.connected && p.id !== this.hostId) ?? this.players.find((p) => p.id !== this.hostId);
    this.hostId = next ? next.id : null;
  }

  isEmpty() {
    return this.players.every((p) => !p.connected);
  }

  touch() {
    this.lastActive = Date.now();
  }

  // ---------- host controls ----------

  setSettings(patch) {
    if (this.game) return { error: 'The game has already started.' };
    const next = mergeSettings(this.settings, patch);
    // Only reject structurally invalid values here; player-count rules are checked at start.
    const err = validateSettings(Math.max(this.players.length, MIN_PLAYERS), next);
    if (err && !/fewer than half|special roles/.test(err)) return { error: err };
    this.settings = next;
    return {};
  }

  start() {
    if (this.game) return { error: 'The game has already started.' };
    const err = validateSettings(this.players.length, this.settings);
    if (err) return { error: err };
    this.game = createGame({
      players: this.players.map((p) => ({ id: p.id, name: p.name })),
      settings: this.settings,
    });
    this.hostMuted.clear();
    this.chat = [];
    this.startClock();
    return {};
  }

  reset() {
    if (!this.game || this.game.phase !== PHASES.GAME_OVER) return { error: 'The game is not over.' };
    clearTimeout(this.timer);
    clearTimeout(this.pauseWatchdog);
    this.game = null;
    this.deadline = null;
    this.paused = false;
    this.pausedRemainingMs = null;
    this.extendCount = 0;
    this.hostMuted.clear();
    this.chat = [];
    this.players = this.players.filter((p) => p.connected);
    if (!this.byId(this.hostId)) this.transferHost();
    return {};
  }

  kick(pid) {
    if (this.game) return { error: 'Cannot remove players during a game.' };
    const p = this.byId(pid);
    if (!p || pid === this.hostId) return { error: 'Cannot remove that player.' };
    this.removePlayer(pid);
    return { player: p };
  }

  setHostMute(pid, muted) {
    if (!this.byId(pid)) return { error: 'Unknown player.' };
    if (muted) this.hostMuted.add(pid);
    else this.hostMuted.delete(pid);
    return {};
  }

  // ---------- gameplay ----------

  act(pid, action) {
    if (!this.game) return { error: 'The game has not started.' };
    const res = act(this.game, pid, action);
    if (!res.ok) return { error: res.error };
    this.touch();
    if (isPhaseComplete(this.game)) this.closeEarly();
    return {};
  }

  closeEarly() {
    if (this.paused) return; // resume will run out the remainder; good enough for this edge case
    const soon = Date.now() + EARLY_CLOSE_MS * this.timeScale;
    if (this.deadline && this.deadline <= soon) return;
    this.deadline = soon;
    this.armTimer();
  }

  startClock() {
    clearTimeout(this.timer);
    clearTimeout(this.pauseWatchdog);
    this.paused = false;
    this.pausedRemainingMs = null;
    this.extendCount = 0;
    const g = this.game;
    if (!g || g.phase === PHASES.GAME_OVER || !g.phaseDuration) {
      this.deadline = null;
      return;
    }
    this.deadline = Date.now() + g.phaseDuration * 1000 * this.timeScale;
    this.armTimer();
  }

  armTimer() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.advance(), Math.max(0, this.deadline - Date.now()));
  }

  advance() {
    if (!this.game) return;
    endPhase(this.game);
    this.startClock();
    this.broadcast();
  }

  /** Phases with a host-configurable timer are the only ones a host may skip/pause/extend. */
  canControlClock() {
    return !!this.game && this.game.phase !== PHASES.GAME_OVER && !FIXED_DURATIONS[this.game.phase];
  }

  skipPhase() {
    if (!this.canControlClock()) return { error: 'This phase cannot be skipped.' };
    clearTimeout(this.timer);
    this.advance(); // same transition a natural timeout would take, just triggered now
    return {};
  }

  pauseTimer() {
    if (!this.canControlClock()) return { error: 'The timer cannot be paused right now.' };
    if (this.paused) return { error: 'The timer is already paused.' };
    clearTimeout(this.timer);
    this.pausedRemainingMs = Math.max(0, this.deadline - Date.now());
    this.paused = true;
    this.pauseWatchdog = setTimeout(() => {
      if (!this.paused) return;
      this.resumeTimer();
      this.broadcast();
    }, MAX_PAUSE_MS * this.timeScale);
    return {};
  }

  resumeTimer() {
    if (!this.paused) return { error: 'The timer is not paused.' };
    clearTimeout(this.pauseWatchdog);
    this.deadline = Date.now() + this.pausedRemainingMs;
    this.pausedRemainingMs = null;
    this.paused = false;
    this.armTimer();
    return {};
  }

  extendTimer(ms) {
    if (!this.canControlClock()) return { error: 'The timer cannot be extended right now.' };
    if (!ALLOWED_EXTEND_MS.includes(ms)) return { error: 'Invalid extension amount.' };
    if (this.extendCount >= MAX_PHASE_EXTENDS) return { error: 'This phase has already been extended the maximum number of times.' };
    this.extendCount += 1;
    const scaled = ms * this.timeScale;
    if (this.paused) this.pausedRemainingMs += scaled;
    else {
      this.deadline += scaled;
      this.armTimer();
    }
    return {};
  }

  // ---------- chat ----------

  sendChat(pid, rawText) {
    const text = String(rawText ?? '').trim().slice(0, 300);
    if (!text) return { error: 'Empty message.' };
    const channel = channelForSender(this, pid);
    if (!channel) return { error: 'You cannot chat right now.' };
    const msg = { id: id(6), channel, from: pid, name: this.byId(pid).name, text, ts: Date.now() };
    this.chat.push(msg);
    if (this.chat.length > MAX_CHAT) this.chat.shift();
    for (const p of this.players) {
      if (p.socketId && canRead(this, p.id, channel)) this.io.to(p.socketId).emit('chat:message', msg);
    }
    return {};
  }

  chatHistoryFor(pid) {
    return this.chat.filter((m) => canRead(this, pid, m.channel));
  }

  // ---------- output ----------

  broadcast() {
    for (const p of this.players) {
      if (p.socketId) this.io.to(p.socketId).emit('state:update', viewFor(this, p.id));
    }
    // Chat channels depend on phase, so keep clients' histories in sync.
    // (Clients filter by what they receive; history is re-sent on phase change.)
    this.sendHistoryOnPhaseChange();
  }

  sendHistoryOnPhaseChange() {
    const phase = this.game ? this.game.phase : PHASES.LOBBY;
    if (phase === this.lastPhaseSent) return;
    this.lastPhaseSent = phase;
    if (phase !== PHASES.GAME_OVER) return;
    // After game over every channel becomes readable.
    for (const p of this.players) {
      if (p.socketId) this.io.to(p.socketId).emit('chat:history', this.chatHistoryFor(p.id));
    }
  }

  destroy() {
    clearTimeout(this.timer);
    clearTimeout(this.pauseWatchdog);
    for (const t of this.disconnectTimers.values()) clearTimeout(t);
  }
}
