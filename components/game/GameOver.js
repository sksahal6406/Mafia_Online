'use client';

import { motion } from 'framer-motion';
import { roleInfo } from '@/lib/roles';
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
        <p className="label">Game over</p>
        <h2 className={`font-display text-4xl ${mafiaWon ? 'text-blood' : 'text-town'}`}>
          {mafiaWon ? 'The Mafia wins!' : 'The Town wins!'}
        </h2>
        <p className="mt-2 text-mute">
          {mafiaWon ? 'The Mafia has reached parity with the Town.' : 'All Mafia members have been eliminated.'}
        </p>

        <ul className="mt-5 grid grid-cols-2 gap-2 text-left text-sm">
          {view.players.map((p) => {
            const info = roleInfo(roles[p.id] ?? p.role);
            return (
              <li key={p.id} className={`flex items-center justify-between rounded-lg border border-line bg-panel-2 px-3 py-2 ${p.alive ? '' : 'opacity-60'}`}>
                <span className="truncate">{p.alive ? '' : '💀 '}{p.name}</span>
                <span className={`shrink-0 ${info.color}`}>{info.emoji} {info.name}</span>
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
            <button className="btn-primary" onClick={resetGame}>Play again</button>
          ) : (
            <span className="self-center text-sm text-mute">Waiting for the host to start a new game…</span>
          )}
          <button className="btn-ghost" onClick={onClose}>View table</button>
          <button className="btn-ghost" onClick={leave}>Leave</button>
        </div>
      </motion.div>
    </div>
  );
}
