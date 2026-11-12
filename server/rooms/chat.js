import { PHASES, ROLES } from '../engine/constants.js';

const NIGHT = new Set([PHASES.NIGHT_MAFIA, PHASES.NIGHT_DOCTOR, PHASES.NIGHT_DETECTIVE]);

/** Which channel a message from this player goes to, or null if they may not chat now. */
export function channelForSender(room, playerId) {
  const g = room.game;
  if (!g || g.phase === PHASES.GAME_OVER) return 'public';
  const me = g.players.find((p) => p.id === playerId);
  if (!me) return null;
  if (!me.alive) return 'dead';
  if (g.phase === PHASES.ROLE_REVEAL) return null;
  if (NIGHT.has(g.phase)) return me.role === ROLES.MAFIA ? 'mafia' : null;
  return 'public';
}

export function canRead(room, playerId, channel) {
  const g = room.game;
  if (channel === 'public' || !g || g.phase === PHASES.GAME_OVER) return true;
  const me = g.players.find((p) => p.id === playerId);
  if (!me) return false;
  if (channel === 'dead') return !me.alive;
  if (channel === 'mafia') return !me.alive || me.role === ROLES.MAFIA;
  return false;
}
