import { describe, expect, it } from 'vitest';
import { PHASES, ROLES, TEAMS } from '../server/engine/constants.js';
import { act, aliveWithRole, createGame, endPhase, isPhaseComplete } from '../server/engine/game.js';
import { defaultSettings, mergeSettings, validateSettings } from '../server/engine/settings.js';

const mkPlayers = (n) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `Player ${i}` }));

function newGame(n = 8, patch = {}) {
  const settings = mergeSettings(defaultSettings(), patch);
  const state = createGame({ players: mkPlayers(n), settings });
  endPhase(state); // role reveal -> night
  return state;
}

const byRole = (state, role) => state.players.filter((p) => p.role === role);
const civ = (state) => byRole(state, ROLES.CIVILIAN);

function mafiaKill(state, target) {
  for (const m of aliveWithRole(state, ROLES.MAFIA)) {
    expect(act(state, m.id, { type: 'mafia_vote', target }).ok).toBe(true);
  }
  expect(isPhaseComplete(state)).toBe(true);
  endPhase(state);
}

describe('settings', () => {
  it('defaults are 2 mafia / 1 doctor / 1 detective', () => {
    const s = defaultSettings();
    expect([s.mafia, s.doctor, s.detective]).toEqual([2, 1, 1]);
    expect(validateSettings(8, s)).toBeNull();
  });
  it('rejects bad player counts and too many mafia', () => {
    expect(validateSettings(5, defaultSettings())).toMatch(/6-12/);
    expect(validateSettings(13, defaultSettings())).toMatch(/6-12/);
    expect(validateSettings(6, mergeSettings(defaultSettings(), { mafia: 3 }))).toMatch(/fewer than half/);
  });
});

describe('setup', () => {
  it('assigns the configured role counts', () => {
    const state = createGame({ players: mkPlayers(10), settings: defaultSettings() });
    expect(byRole(state, ROLES.MAFIA)).toHaveLength(2);
    expect(byRole(state, ROLES.DOCTOR)).toHaveLength(1);
    expect(byRole(state, ROLES.DETECTIVE)).toHaveLength(1);
    expect(byRole(state, ROLES.CIVILIAN)).toHaveLength(6);
    expect(state.phase).toBe(PHASES.ROLE_REVEAL);
  });
});

describe('night', () => {
  it('requires unanimous mafia consensus; otherwise nobody dies', () => {
    const state = newGame();
    const [m1, m2] = byRole(state, ROLES.MAFIA);
    const [c1, c2] = civ(state);
    act(state, m1.id, { type: 'mafia_vote', target: c1.id });
    act(state, m2.id, { type: 'mafia_vote', target: c2.id });
    expect(isPhaseComplete(state)).toBe(false);
    endPhase(state); // timeout with disagreement
    expect(state.night.target).toBeNull();
  });

  it('follows mafia -> doctor -> detective order', () => {
    const state = newGame();
    expect(state.phase).toBe(PHASES.NIGHT_MAFIA);
    mafiaKill(state, civ(state)[0].id);
    expect(state.phase).toBe(PHASES.NIGHT_DOCTOR);
    endPhase(state);
    expect(state.phase).toBe(PHASES.NIGHT_DETECTIVE);
  });

  it('doctor save cancels the kill', () => {
    const state = newGame();
    const victim = civ(state)[0];
    const doctor = byRole(state, ROLES.DOCTOR)[0];
    mafiaKill(state, victim.id);
    act(state, doctor.id, { type: 'protect', target: victim.id });
    endPhase(state);
    endPhase(state); // detective times out
    expect(state.phase).toBe(PHASES.DAY_ANNOUNCE);
    expect(victim.alive).toBe(true);
    expect(state.history.at(-1).victim).toBeNull();
  });

  it('unprotected target is eliminated and role recorded', () => {
    const state = newGame();
    const victim = civ(state)[0];
    mafiaKill(state, victim.id);
    endPhase(state);
    endPhase(state);
    expect(victim.alive).toBe(false);
    expect(state.history.at(-1)).toMatchObject({ victim: victim.id, role: ROLES.CIVILIAN });
  });

  it('detective gets a private Mafia / Not Mafia result', () => {
    const state = newGame();
    const det = byRole(state, ROLES.DETECTIVE)[0];
    mafiaKill(state, civ(state)[0].id);
    endPhase(state);
    const mafioso = byRole(state, ROLES.MAFIA)[0];
    expect(act(state, det.id, { type: 'investigate', target: mafioso.id }).ok).toBe(true);
    expect(state.night.results[det.id].isMafia).toBe(true);
    expect(act(state, det.id, { type: 'investigate', target: civ(state)[1].id }).ok).toBe(false);
  });

  it('rejects wrong-role, dead-target and out-of-phase actions', () => {
    const state = newGame();
    const c = civ(state)[0];
    expect(act(state, c.id, { type: 'mafia_vote', target: civ(state)[1].id }).ok).toBe(false);
    const m = byRole(state, ROLES.MAFIA)[0];
    expect(act(state, m.id, { type: 'protect', target: c.id }).ok).toBe(false);
    civ(state)[1].alive = false;
    expect(act(state, m.id, { type: 'mafia_vote', target: civ(state)[1].id }).ok).toBe(false);
  });

  it('skips doctor/detective phases when none are alive', () => {
    const state = newGame(8, { doctor: 0, detective: 0 });
    mafiaKill(state, civ(state)[0].id);
    expect(state.phase).toBe(PHASES.DAY_ANNOUNCE);
  });
});

describe('day', () => {
  function toVote(state) {
    mafiaKill(state, civ(state)[0].id);
    endPhase(state);
    endPhase(state);
    endPhase(state); // announce -> discussion
    endPhase(state); // discussion -> vote
    expect(state.phase).toBe(PHASES.DAY_VOTE);
  }

  it('eliminates the player with most votes', () => {
    const state = newGame(10);
    toVote(state);
    const alive = state.players.filter((p) => p.alive);
    const target = alive.find((p) => p.role === ROLES.CIVILIAN);
    for (const p of alive) {
      if (p.id !== target.id) act(state, p.id, { type: 'vote', target: target.id });
    }
    act(state, target.id, { type: 'vote', target: null });
    expect(isPhaseComplete(state)).toBe(true);
    endPhase(state);
    expect(target.alive).toBe(false);
    expect(state.phase).toBe(PHASES.DAY_RESULT);
  });

  it('forbids self votes, dead voters, and nobody dies on all-abstain', () => {
    const state = newGame(10);
    toVote(state);
    const [a] = state.players.filter((p) => p.alive);
    expect(act(state, a.id, { type: 'vote', target: a.id }).ok).toBe(false);
    const dead = state.players.find((p) => !p.alive);
    expect(act(state, dead.id, { type: 'vote', target: a.id }).ok).toBe(false);
    endPhase(state); // timeout, nobody voted
    expect(state.history.at(-1).victim).toBeNull();
    expect(state.phase).toBe(PHASES.DAY_RESULT);
  });

  it('tie -> revote among tied only; second tie eliminates nobody', () => {
    const state = newGame(10);
    toVote(state);
    const alive = state.players.filter((p) => p.alive);
    const [x, y, ...rest] = alive;
    rest.slice(0, 6).forEach((p, i) => act(state, p.id, { type: 'vote', target: i % 2 ? x.id : y.id }));
    act(state, x.id, { type: 'vote', target: y.id });
    act(state, y.id, { type: 'vote', target: x.id });
    endPhase(state);
    expect(state.phase).toBe(PHASES.DAY_REVOTE_DISCUSS);
    expect(state.day.tied.sort()).toEqual([x.id, y.id].sort());
    endPhase(state);
    expect(state.phase).toBe(PHASES.DAY_REVOTE);
    expect(act(state, rest[0].id, { type: 'vote', target: rest[1].id }).ok).toBe(false);
    act(state, rest[0].id, { type: 'vote', target: x.id });
    act(state, rest[1].id, { type: 'vote', target: y.id });
    endPhase(state);
    expect(state.phase).toBe(PHASES.DAY_RESULT);
    expect(state.history.at(-1).victim).toBeNull();
    expect(x.alive && y.alive).toBe(true);
  });
});

describe('win conditions', () => {
  it('town wins when all mafia are eliminated', () => {
    const state = newGame(8);
    mafiaKill(state, civ(state)[0].id);
    endPhase(state);
    endPhase(state);
    endPhase(state);
    endPhase(state);
    const [m1, m2] = byRole(state, ROLES.MAFIA);
    m2.alive = false; // pretend one already died
    const alive = state.players.filter((p) => p.alive);
    for (const p of alive) if (p.id !== m1.id) act(state, p.id, { type: 'vote', target: m1.id });
    endPhase(state);
    expect(state.winner).toBe(TEAMS.TOWN);
    endPhase(state);
    expect(state.phase).toBe(PHASES.GAME_OVER);
  });

  it('mafia win at parity after a night kill', () => {
    const state = newGame(6, { doctor: 0, detective: 0 });
    // 6 players, 2 mafia, 4 civilians. Kill one civilian -> 2 vs 3, then another -> 2 vs 2.
    const [c1, c2] = civ(state);
    mafiaKill(state, c1.id);
    expect(state.winner).toBeNull();
    state.phase = PHASES.DAY_ANNOUNCE;
    endPhase(state);
    state.phase = PHASES.DAY_RESULT;
    endPhase(state);
    mafiaKill(state, c2.id);
    expect(state.winner).toBe(TEAMS.MAFIA);
    expect(state.phase).toBe(PHASES.DAY_ANNOUNCE);
    endPhase(state);
    expect(state.phase).toBe(PHASES.GAME_OVER);
  });

  it('no actions allowed after game over', () => {
    const state = newGame(6, { doctor: 0, detective: 0 });
    state.winner = TEAMS.TOWN;
    expect(act(state, 'p0', { type: 'vote', target: 'p1' }).ok).toBe(false);
  });
});
