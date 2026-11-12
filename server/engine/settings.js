import { DEFAULT_SETTINGS, MAX_PLAYERS, MIN_PLAYERS, TIMER_LIMITS } from './constants.js';

/** Merge partial settings over defaults (timers merged one level deep). */
export function mergeSettings(base, patch = {}) {
  const out = {
    ...base,
    timers: { ...base.timers },
  };
  for (const key of ['mafia', 'doctor', 'detective']) {
    if (patch[key] !== undefined) out[key] = Number(patch[key]);
  }
  if (patch.video !== undefined) out.video = Boolean(patch.video);
  if (patch.timers) {
    for (const key of Object.keys(TIMER_LIMITS)) {
      if (patch.timers[key] !== undefined) out.timers[key] = Number(patch.timers[key]);
    }
  }
  return out;
}

export function defaultSettings() {
  return mergeSettings(DEFAULT_SETTINGS);
}

/** Returns an error string, or null if the settings are valid for this player count. */
export function validateSettings(playerCount, settings) {
  const { mafia, doctor, detective, timers } = settings;
  if (!Number.isInteger(playerCount) || playerCount < MIN_PLAYERS || playerCount > MAX_PLAYERS) {
    return `Games need ${MIN_PLAYERS}-${MAX_PLAYERS} players.`;
  }
  if (!Number.isInteger(mafia) || mafia < 1 || mafia > 4) return 'Mafia count must be 1-4.';
  if (!Number.isInteger(doctor) || doctor < 0 || doctor > 2) return 'Doctor count must be 0-2.';
  if (!Number.isInteger(detective) || detective < 0 || detective > 2) {
    return 'Detective count must be 0-2.';
  }
  if (typeof settings.video !== 'boolean') return 'Video must be on or off.';
  if (mafia * 2 >= playerCount) return 'Mafia must be fewer than half of the players.';
  if (mafia + doctor + detective > playerCount) return 'Too many special roles for this player count.';
  for (const [key, [min, max]] of Object.entries(TIMER_LIMITS)) {
    const v = timers[key];
    if (!Number.isFinite(v) || v < min || v > max) return `Timer "${key}" must be ${min}-${max} seconds.`;
  }
  return null;
}
