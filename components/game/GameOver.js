'use client';

import { motion } from 'framer-motion';
import { Eye as EyeIcon, LogOut, RotateCcw, Skull, Trophy } from 'lucide-react';
import { roleInfo } from '@/lib/roles';
import { RoleIcon } from '../ui/icons';
import { useGame } from '@/lib/store';

export default function GameOver({ view, onClose }) {
  const { resetGame, leave } = useGame();
  const isHost = view.hostId === view.youId;
  const mafiaWon = view.winner === 'mafia';
  const roles = view.private?.roles ?? {};
  const name = (id) => view.players.find((p) => p.id === id)?.name ?? '?';

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-ink/90 px-4 py-8">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card w-full max-w-lg text-center">
        <Trophy className={`mx-auto mb-2 h-12 w-12 ${mafiaWon ? 'text-blood' : 'text-town'}`} aria-hidden="true" />
        <p className="label">Game over</p>
        <h2 className={`font-display text-5xl font-bold ${mafiaWon ? 'text-blood' : 'text-town'}`}>
          {mafiaWon ? 'The Mafia wins!' : 'The Town wins!'}
        </h2>
        <p className="mt-2 text-mute">
          {mafiaWon ? 'The Mafia has reached parity with the Town.' : 'All Mafia members have been eliminated.'}
        </p>

        <ul className="mt-5 grid grid-cols-2 gap-2 text-left text-sm">
          {view.players.map((p) => {
            const info = roleInfo(roles[p.id] ?? p.role);
            return (
              <li key={p.id} className={`flex items-center justify-between gap-2 rounded-xl border-2 border-line bg-panel-2 px-3 py-2 ${p.alive ? '' : 'opacity-60'}`}>
                <span className="flex min-w-0 items-center gap-1.5 truncate font-semibold">{!p.alive && <Skull className="h-4 w-4 shrink-0" aria-label="Eliminated" />}{p.name}</span>
                <span className={`flex shrink-0 items-center gap-1 font-bold ${info.color}`}><RoleIcon role={roles[p.id] ?? p.role} className="h-4 w-4" /> {info.name}</span>
              </li>
            );
          })}
        </ul>

        <details className="mt-4 text-left text-sm text-mute">
          <summary className="cursor-pointer text-bone">Game summary</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            {view.history.filter((h) => h.victim).map((h, i) => (
              <li key={i}>
                {h.type === 'night' ? `Night ${h.round}` : `Day ${h.round}`}: {name(h.victim)} ({roleInfo(h.role).name}){' '}
                {h.type === 'night' ? 'was killed' : 'was voted out'}
              </li>
            ))}
          </ol>
        </details>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {isHost ? (
            <button className="btn-primary" onClick={resetGame}><RotateCcw className="h-5 w-5" aria-hidden="true" /> Play again</button>
          ) : (
            <span className="self-center text-sm text-mute">Waiting for the host to start a new game…</span>
          )}
          <button className="btn-ghost" onClick={onClose}><EyeIcon className="h-5 w-5" aria-hidden="true" /> View table</button>
          <button className="btn-ghost" onClick={leave}><LogOut className="h-5 w-5" aria-hidden="true" /> Leave</button>
        </div>
      </motion.div>
    </div>
  );
}
