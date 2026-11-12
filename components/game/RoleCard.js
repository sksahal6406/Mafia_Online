'use client';

import { roleInfo } from '@/lib/roles';

/** Compact reminder of the player's own role. */
export default function RoleCard({ view }) {
  if (!view.you) return null;
  const info = roleInfo(view.you.role);
  const mates = view.you.role === 'mafia' ? view.players.filter((p) => p.role === 'mafia' && p.id !== view.youId) : [];
  return (
    <section className={`card flex items-start gap-3 !p-3 ring-1 ${info.ring}/40`}>
      <span className="text-3xl">{info.emoji}</span>
      <div className="min-w-0 text-sm">
        <p className={`font-display text-lg ${info.color}`}>{info.name}</p>
        <p className="text-mute">{info.goal}</p>
        {mates.length > 0 && (
          <p className="mt-1">Partners: {mates.map((m) => (
            <b key={m.id} className={m.alive ? 'text-blood' : 'text-mute line-through'}>{m.name} </b>
          ))}</p>
        )}
        {view.private?.findings?.length > 0 && (
          <ul className="mt-2 space-y-0.5 border-t border-line pt-2 text-xs">
            {view.private.findings.map((f) => (
              <li key={f.round}>
                Night {f.round}: {view.players.find((p) => p.id === f.target)?.name} —{' '}
                <b className={f.isMafia ? 'text-blood' : 'text-town'}>{f.isMafia ? 'Mafia' : 'Not Mafia'}</b>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
