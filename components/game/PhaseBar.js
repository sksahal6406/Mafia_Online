'use client';

import { Users } from 'lucide-react';
import { phaseTitle } from '@/lib/phases';
import { clock, useCountdown } from '@/lib/useCountdown';
import { PhaseIcon } from '../ui/icons';

export default function PhaseBar({ view, night }) {
  const { title, subtitle } = phaseTitle(view.phase);
  const ms = useCountdown(view.deadline);
  const total = Math.max(view.phaseDuration * 1000, ms, 1);
  const pct = view.deadline ? Math.min(100, (ms / total) * 100) : 0;
  const urgent = view.deadline && ms < 10_000;
  const alive = view.players.filter((p) => p.alive).length;

  return (
    <header className={`border-b-2 px-4 py-3 transition-colors duration-1000 ${night ? 'border-night/30 bg-[#0a0d1f]' : 'border-line bg-panel'}`}>
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] ${night ? 'bg-night text-white' : 'bg-gold text-black'}`}
          >
            <PhaseIcon phase={view.phase} className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-xl font-semibold leading-tight">
              {title}
              {view.round > 0 && <span className="ml-2 text-sm font-medium text-mute">Round {view.round}</span>}
            </h1>
            <p className="truncate text-sm text-mute">{subtitle}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="chip hidden sm:inline-flex" title="Players still in the game">
            <Users className="h-3.5 w-3.5" aria-hidden="true" /> {alive} alive
          </span>
          {view.deadline && (
            <span
              role="timer"
              className={`rounded-xl border-2 px-3 py-1 font-mono text-2xl font-bold tabular-nums sm:text-3xl ${
                urgent ? 'animate-pulse border-blood bg-blood/15 text-blood' : 'border-line bg-panel-2 text-bone'
              }`}
            >
              {clock(ms)}
            </span>
          )}
        </div>
      </div>
      {view.deadline && (
        <div className="mx-auto mt-3 h-2 max-w-[1500px] overflow-hidden rounded-full border border-black bg-line">
          <div className={`h-full rounded-full transition-[width] duration-300 ease-linear ${urgent ? 'bg-blood' : 'bg-gold'}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </header>
  );
}
