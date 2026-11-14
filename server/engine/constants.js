export const ROLES = {
  MAFIA: 'mafia',
  DOCTOR: 'doctor',
  DETECTIVE: 'detective',
  CIVILIAN: 'civilian',
};

export const PHASES = {
  LOBBY: 'lobby',
  ROLE_REVEAL: 'role_reveal',
  NIGHT_MAFIA: 'night_mafia',
  NIGHT_DOCTOR: 'night_doctor',
  NIGHT_DETECTIVE: 'night_detective',
  DAY_ANNOUNCE: 'day_announce',
  DAY_DISCUSSION: 'day_discussion',
  DAY_VOTE: 'day_vote',
  DAY_REVOTE_DISCUSS: 'day_revote_discuss',
  DAY_REVOTE: 'day_revote',
  DAY_RESULT: 'day_result',
  GAME_OVER: 'game_over',
};

export const TEAMS = { MAFIA: 'mafia', TOWN: 'town' };

export const MIN_PLAYERS = 6;
export const MAX_PLAYERS = 12;

export const DEFAULT_SETTINGS = {
  mafia: 2,
  doctor: 1,
  detective: 1,
  video: true,
  timers: {
    night: 45,
    discussion: 180,
    vote: 30,
    revoteDiscussion: 30,
  },
};

export const TIMER_LIMITS = {
  night: [15, 120],
  discussion: [30, 600],
  vote: [10, 120],
  revoteDiscussion: [10, 120],
};

// Fixed-length phases (seconds), not host-configurable.
export const FIXED_DURATIONS = {
  [PHASES.ROLE_REVEAL]: 10,
  [PHASES.DAY_ANNOUNCE]: 8,
  [PHASES.DAY_RESULT]: 8,
};

// How many times a host may extend a single phase's clock.
export const MAX_PHASE_EXTENDS = 3;
export const ALLOWED_EXTEND_MS = [15_000, 30_000, 60_000];
