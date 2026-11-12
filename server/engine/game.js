import { FIXED_DURATIONS, PHASES, ROLES, TEAMS } from './constants.js';
import { validateSettings } from './settings.js';

/*
 * Pure game engine: no sockets, no timers. The room layer owns the clock and
 * calls endPhase() on timeout (or when isPhaseComplete() turns true).
 * All functions mutate the state they are given.
 */

function shuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** players: [{ id, name }]. Throws on invalid settings. */
export function createGame({ players, settings, rng = Math.random }) {
  const err = validateSettings(players.length, settings);
  if (err) throw new Error(err);

  const roles = [
    ...Array(settings.mafia).fill(ROLES.MAFIA),
    ...Array(settings.doctor).fill(ROLES.DOCTOR),
    ...Array(settings.detective).fill(ROLES.DETECTIVE),
  ];
  while (roles.length < players.length) roles.push(ROLES.CIVILIAN);
  const shuffled = shuffle(roles, rng);

  const state = {
    settings,
    players: players.map((p, i) => ({ id: p.id, name: p.name, role: shuffled[i], alive: true })),
    phase: null,
    phaseDuration: 0,
    round: 1,
    night: null,
    day: null,
    history: [],
    findings: {},
    winner: null,
  };
  startPhase(state, PHASES.ROLE_REVEAL);
  return state;
}

// ---------- queries ----------

export const getPlayer = (state, id) => state.players.find((p) => p.id === id);
export const alivePlayers = (state) => state.players.filter((p) => p.alive);
export const aliveWithRole = (state, role) =>
  state.players.filter((p) => p.alive && p.role === role);

function durationFor(state, phase) {
  const t = state.settings.timers;
  switch (phase) {
    case PHASES.NIGHT_MAFIA:
    case PHASES.NIGHT_DOCTOR:
    case PHASES.NIGHT_DETECTIVE:
      return t.night;
    case PHASES.DAY_DISCUSSION:
      return t.discussion;
    case PHASES.DAY_VOTE:
    case PHASES.DAY_REVOTE:
      return t.vote;
    case PHASES.DAY_REVOTE_DISCUSS:
      return t.revoteDiscussion;
    default:
      return FIXED_DURATIONS[phase] ?? 0;
  }
}

function startPhase(state, phase) {
  state.phase = phase;
  state.phaseDuration = durationFor(state, phase);
  if (phase === PHASES.DAY_VOTE) state.day = { votes: {}, tied: [] };
  if (phase === PHASES.DAY_REVOTE) state.day = { votes: {}, tied: state.day.tied };
}

function freshNight() {
  return { mafiaVotes: {}, protects: {}, investigations: {}, target: null, results: {} };
}

// ---------- actions ----------

const ok = () => ({ ok: true });
const fail = (error) => ({ ok: false, error });

/**
 * Player actions:
 *  { type: 'mafia_vote', target }  { type: 'protect', target }
 *  { type: 'investigate', target } { type: 'vote', target }  (target null = abstain)
 */
export function act(state, playerId, action) {
  if (state.winner || state.phase === PHASES.GAME_OVER) return fail('The game is over.');
  const me = getPlayer(state, playerId);
  if (!me) return fail('Unknown player.');
  if (!me.alive) return fail('Eliminated players cannot act.');

  const target = action.target == null ? null : getPlayer(state, action.target);
  const checkTarget = () => {
    if (!target) return fail('Choose a player.');
    if (!target.alive) return fail('That player is eliminated.');
    return null;
  };

  switch (action.type) {
    case 'mafia_vote': {
      if (state.phase !== PHASES.NIGHT_MAFIA || me.role !== ROLES.MAFIA) return fail('Not allowed right now.');
      const bad = checkTarget();
      if (bad) return bad;
      state.night.mafiaVotes[me.id] = target.id;
      return ok();
    }
    case 'protect': {
      if (state.phase !== PHASES.NIGHT_DOCTOR || me.role !== ROLES.DOCTOR) return fail('Not allowed right now.');
      const bad = checkTarget();
      if (bad) return bad;
      state.night.protects[me.id] = target.id;
      return ok();
    }
    case 'investigate': {
      if (state.phase !== PHASES.NIGHT_DETECTIVE || me.role !== ROLES.DETECTIVE) return fail('Not allowed right now.');
      const bad = checkTarget();
      if (bad) return bad;
      if (target.id === me.id) return fail('You cannot investigate yourself.');
      if (state.night.investigations[me.id]) return fail('You already investigated tonight.');
      state.night.investigations[me.id] = target.id;
      const result = { round: state.round, target: target.id, isMafia: target.role === ROLES.MAFIA };
      state.night.results[me.id] = result;
      (state.findings[me.id] ??= []).push(result);
      return ok();
    }
    case 'vote': {
      if (state.phase !== PHASES.DAY_VOTE && state.phase !== PHASES.DAY_REVOTE) return fail('Voting is not open.');
      if (target) {
        const bad = checkTarget();
        if (bad) return bad;
        if (target.id === me.id) return fail('You cannot vote for yourself.');
        if (state.phase === PHASES.DAY_REVOTE && !state.day.tied.includes(target.id)) {
          return fail('Choose one of the tied players.');
        }
      }
      state.day.votes[me.id] = target ? target.id : null;
      return ok();
    }
    default:
      return fail('Unknown action.');
  }
}

// ---------- phase progression ----------

function mafiaConsensus(state) {
  const mafia = aliveWithRole(state, ROLES.MAFIA);
  const votes = mafia.map((m) => state.night.mafiaVotes[m.id]);
  if (votes.length === 0 || votes.some((v) => !v)) return null;
  return votes.every((v) => v === votes[0]) ? votes[0] : null;
}

/** True when the current phase can end before its timer (everyone relevant has acted). */
export function isPhaseComplete(state) {
  switch (state.phase) {
    case PHASES.NIGHT_MAFIA:
      return mafiaConsensus(state) !== null;
    case PHASES.NIGHT_DOCTOR:
      return aliveWithRole(state, ROLES.DOCTOR).every((p) => state.night.protects[p.id]);
    case PHASES.NIGHT_DETECTIVE:
      return aliveWithRole(state, ROLES.DETECTIVE).every((p) => state.night.investigations[p.id]);
    case PHASES.DAY_VOTE:
    case PHASES.DAY_REVOTE:
      return alivePlayers(state).every((p) => p.id in state.day.votes);
    default:
      return false;
  }
}

function checkWinner(state) {
  const alive = alivePlayers(state);
  const mafia = alive.filter((p) => p.role === ROLES.MAFIA).length;
  const others = alive.length - mafia;
  if (mafia === 0) return TEAMS.TOWN;
  if (mafia >= others) return TEAMS.MAFIA;
  return null;
}

function eliminate(state, id) {
  const p = getPlayer(state, id);
  p.alive = false;
  state.winner = checkWinner(state);
  return p;
}

function startNight(state) {
  state.night = freshNight();
  startPhase(state, PHASES.NIGHT_MAFIA);
}

// Roles that are dead or absent are skipped: their deaths are public, so skipping leaks nothing.
function nextNightPhase(state, after) {
  const order = [
    [PHASES.NIGHT_DOCTOR, ROLES.DOCTOR],
    [PHASES.NIGHT_DETECTIVE, ROLES.DETECTIVE],
  ];
  const start = after === PHASES.NIGHT_MAFIA ? 0 : 1;
  for (let i = start; i < order.length; i++) {
    if (aliveWithRole(state, order[i][1]).length > 0) {
      startPhase(state, order[i][0]);
      return;
    }
  }
  resolveNight(state);
}

function resolveNight(state) {
  const { target, protects } = state.night;
  const saved = target && Object.values(protects).includes(target);
  let victim = null;
  if (target && !saved) victim = eliminate(state, target);
  state.history.push({
    type: 'night',
    round: state.round,
    victim: victim ? victim.id : null,
    role: victim ? victim.role : null,
  });
  startPhase(state, PHASES.DAY_ANNOUNCE);
}

function tallyVotes(state) {
  const tally = {};
  let abstain = 0;
  for (const p of alivePlayers(state)) {
    const v = state.day.votes[p.id];
    if (v) tally[v] = (tally[v] ?? 0) + 1;
    else abstain++;
  }
  return { tally, abstain };
}

function resolveVote(state, isRevote) {
  const { tally, abstain } = tallyVotes(state);
  const max = Math.max(0, ...Object.values(tally));
  const top = Object.keys(tally).filter((id) => tally[id] === max);
  const entry = { type: 'vote', round: state.round, revote: isRevote, tally, abstain, victim: null, role: null, tied: [] };

  if (max > 0 && top.length === 1) {
    const p = eliminate(state, top[0]);
    entry.victim = p.id;
    entry.role = p.role;
  } else if (max > 0 && !isRevote) {
    entry.tied = top;
    state.history.push(entry);
    state.day = { votes: {}, tied: top };
    startPhase(state, PHASES.DAY_REVOTE_DISCUSS);
    return;
  }
  state.history.push(entry);
  startPhase(state, PHASES.DAY_RESULT);
}

/** Advance to the next phase (called on timeout or when isPhaseComplete()). */
export function endPhase(state) {
  switch (state.phase) {
    case PHASES.ROLE_REVEAL:
      return startNight(state);
    case PHASES.NIGHT_MAFIA:
      state.night.target = mafiaConsensus(state);
      return nextNightPhase(state, PHASES.NIGHT_MAFIA);
    case PHASES.NIGHT_DOCTOR:
      return nextNightPhase(state, PHASES.NIGHT_DOCTOR);
    case PHASES.NIGHT_DETECTIVE:
      return resolveNight(state);
    case PHASES.DAY_ANNOUNCE:
      if (state.winner) return startPhase(state, PHASES.GAME_OVER);
      return startPhase(state, PHASES.DAY_DISCUSSION);
    case PHASES.DAY_DISCUSSION:
      return startPhase(state, PHASES.DAY_VOTE);
    case PHASES.DAY_VOTE:
      return resolveVote(state, false);
    case PHASES.DAY_REVOTE_DISCUSS:
      return startPhase(state, PHASES.DAY_REVOTE);
    case PHASES.DAY_REVOTE:
      return resolveVote(state, true);
    case PHASES.DAY_RESULT:
      if (state.winner) return startPhase(state, PHASES.GAME_OVER);
      state.round += 1;
      return startNight(state);
    default:
      return undefined;
  }
}
