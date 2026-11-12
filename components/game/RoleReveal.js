'use client';

import { motion } from 'framer-motion';
import { EyeOff } from 'lucide-react';
import { roleInfo } from '@/lib/roles';
import { RoleIcon } from '../ui/icons';
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
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-black bg-panel-2 shadow-[3px_3px_0_0_#000]">
          <RoleIcon role={view.you?.role} className={`h-14 w-14 ${info.color}`} />
        </div>
        <h2 className={`mt-3 font-display text-5xl font-bold ${info.color}`}>{info.name}</h2>
        <p className="mt-3 text-mute">{info.blurb}</p>
        <p className="mt-3 text-sm"><b>Goal:</b> {info.goal}</p>
        {mates.length > 0 && (
          <p className="mt-3 rounded-xl border-2 border-blood/50 bg-blood/10 px-3 py-2 text-sm">
            Your partners in crime: <b className="text-blood">{mates.map((m) => m.name).join(', ')}</b>
          </p>
        )}
      </motion.div>
      <p className="mt-6 flex items-center gap-2 text-sm font-semibold text-mute"><EyeOff className="h-4 w-4" aria-hidden="true" /> Keep this secret. The first night begins in <span className="font-mono text-bone">{clock(ms)}</span></p>
    </div>
  );
}
