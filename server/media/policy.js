import { PHASES, ROLES } from '../engine/constants.js';

const NIGHT = new Set([PHASES.NIGHT_MAFIA, PHASES.NIGHT_DOCTOR, PHASES.NIGHT_DETECTIVE]);

/**
 * Who may this player send media to, and whose media should they play?
 * Enforced client-side (trust-based mesh): see lib/webrtc.
 * Returns { sendTo: [ids], receiveFrom: [ids], forceMuted: bool }.
 */
export function mediaPolicyFor(room, playerId) {
  const g = room.game;
  const others = room.players.filter((p) => p.id !== playerId).map((p) => p.id);
  // video:false means no camera tracks are created or sent at all (audio-only room).
  const policy = { sendTo: [], receiveFrom: [], forceMuted: room.hostMuted.has(playerId), video: room.settings.video };

  if (!g || g.phase === PHASES.GAME_OVER) {
    policy.sendTo = others;
    policy.receiveFrom = others;
    policy.forceMuted = false;
    return policy;
  }

  const me = g.players.find((p) => p.id === playerId);
  if (!me) return policy;
  const aliveMafiaIds = g.players.filter((p) => p.alive && p.role === ROLES.MAFIA).map((p) => p.id);
  const aliveIds = g.players.filter((p) => p.alive).map((p) => p.id);

  if (g.phase === PHASES.ROLE_REVEAL) return policy;

  if (NIGHT.has(g.phase)) {
    if (!me.alive) {
      // Spectators listen in on the Mafia channel but never speak.
      policy.receiveFrom = aliveMafiaIds;
      policy.forceMuted = true;
    } else if (me.role === ROLES.MAFIA) {
      const mates = aliveMafiaIds.filter((id) => id !== playerId);
      policy.sendTo = mates;
      policy.receiveFrom = mates;
    }
    return policy;
  }

  // Day phases: the living talk to everyone; the dead listen only.
  policy.receiveFrom = aliveIds.filter((id) => id !== playerId);
  if (me.alive) policy.sendTo = others;
  else policy.forceMuted = true;
  return policy;
}
