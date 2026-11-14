import { MAX_PHASE_EXTENDS, PHASES, ROLES } from '../engine/constants.js';
import { mediaPolicyFor } from '../media/policy.js';
import { channelForSender } from '../rooms/chat.js';

const NIGHT = new Set([PHASES.NIGHT_MAFIA, PHASES.NIGHT_DOCTOR, PHASES.NIGHT_DETECTIVE]);

/**
 * Projects the room state into what ONE player is allowed to see.
 * Secret data (roles, night actions, investigation results) never leaves
 * the server except through this function.
 */
export function viewFor(room, playerId) {
  const g = room.game;
  const over = !!g && g.phase === PHASES.GAME_OVER;
  const meGame = g?.players.find((p) => p.id === playerId);
  const spectator = !!g && !!meGame && (!meGame.alive || over);
  const myRole = meGame?.role ?? null;

  const players = room.players.map((rp) => {
    const gp = g?.players.find((p) => p.id === rp.id);
    const dead = gp ? !gp.alive : false;
    const revealRole =
      !!gp &&
      (spectator ||
        dead ||
        rp.id === playerId ||
        (myRole === ROLES.MAFIA && gp.role === ROLES.MAFIA));
    return {
      id: rp.id,
      name: rp.name,
      connected: rp.connected,
      isHost: rp.id === room.hostId,
      alive: gp ? gp.alive : true,
      role: revealRole ? gp.role : null,
      hostMuted: room.hostMuted.has(rp.id),
    };
  });

  const view = {
    code: room.code,
    youId: playerId,
    hostId: room.hostId,
    settings: room.settings,
    phase: g ? g.phase : PHASES.LOBBY,
    round: g ? g.round : 0,
    phaseDuration: g ? g.phaseDuration : 0,
    deadline: room.deadline,
    paused: room.paused,
    pausedRemainingMs: room.pausedRemainingMs,
    timerControllable: room.canControlClock(),
    extendsLeft: Math.max(0, MAX_PHASE_EXTENDS - room.extendCount),
    serverNow: Date.now(),
    winner: over ? g.winner : null,
    players,
    history: g ? g.history : [],
    media: mediaPolicyFor(room, playerId),
    chatChannel: channelForSender(room, playerId),
    private: {},
  };
  if (!g || !meGame) return view;

  view.you = { role: myRole, alive: meGame.alive, spectator };

  const priv = view.private;
  if (g.day) {
    priv.myVote = playerId in g.day.votes ? g.day.votes[playerId] : undefined;
    view.day = {
      tied: g.day.tied,
      voted: g.players.filter((p) => p.alive && p.id in g.day.votes).length,
    };
  }

  if (spectator) {
    // The dead (and everyone after game over) see the secret night actions.
    if (NIGHT.has(g.phase) || over) priv.night = g.night;
    if (over) priv.roles = Object.fromEntries(g.players.map((p) => [p.id, p.role]));
  } else {
    if (myRole === ROLES.MAFIA && g.night) priv.mafiaVotes = g.night.mafiaVotes;
    if (myRole === ROLES.DOCTOR && g.night) priv.myProtect = g.night.protects[playerId] ?? null;
    if (myRole === ROLES.DETECTIVE) priv.findings = g.findings[playerId] ?? [];
  }
  return view;
}
