'use client';

import { motion } from 'framer-motion';
import { roleInfo } from '@/lib/roles';
import { clock, useCountdown } from '@/lib/useCountdown';

/** Full-screen secret role card shown at the start of the game. */
export default function RoleReveal({ view }) {
  const ms = useCountdown(view.deadline);
  const info = roleInfo(view.you?.role);
  const mates = view.players.filter((p) => p.role === 'mafia' && p.id !== view.youId && view.you?.role === 'mafia');

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-ink/95 px-4 text-center">
      <p className="label">You are</p>
      <motion.div
        initial={{ rotateY: 90, opacity: 0 }}
        animate={{ rotateY: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className={`card w-full max-w-sm ring-2 ${info.ring}`}
      >
        <div className="text-7xl">{info.emoji}</div>
        <h2 className={`mt-2 font-display text-4xl ${info.color}`}>{info.name}</h2>
        <p className="mt-3 text-mute">{info.blurb}</p>
        <p className="mt-3 text-sm"><b>Goal:</b> {info.goal}</p>
        {mates.length > 0 && (
          <p className="mt-3 rounded-lg bg-blood/10 px-3 py-2 text-sm">
            Your partners in crime: <b className="text-blood">{mates.map((m) => m.name).join(', ')}</b>
          </p>
        )}
      </motion.div>
      <p className="mt-6 text-sm text-mute">Keep this secret. The first night begins in <span className="font-mono text-bone">{clock(ms)}</span></p>
    </div>
  );
}
