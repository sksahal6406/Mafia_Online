'use client';

import { phaseTitle } from '@/lib/phases';
import { clock, useCountdown } from '@/lib/useCountdown';

export default function PhaseBar({ view, night }) {
  const { emoji, title, subtitle } = phaseTitle(view.phase);
  const ms = useCountdown(view.deadline);
  const total = Math.max(view.phaseDuration * 1000, ms, 1);
  const pct = view.deadline ? Math.min(100, (ms / total) * 100) : 0;
  const urgent = view.deadline && ms < 10_000;

  return (
    <header className={`border-b px-4 py-3 transition-colors duration-1000 ${night ? 'border-night/20 bg-[#0a0d1f]' : 'border-line bg-panel'}`}>
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{emoji}</span>
          <div>
            <h1 className="font-display text-xl leading-tight">
              {title}
              {view.round > 0 && <span className="ml-2 text-sm text-mute">Round {view.round}</span>}
            </h1>
            <p className="text-sm text-mute">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="hidden text-mute sm:inline">
            {view.players.filter((p) => p.alive).length} alive
          </span>
          {view.deadline && (
            <span className={`font-mono text-3xl tabular-nums ${urgent ? 'text-blood' : 'text-bone'}`}>{clock(ms)}</span>
          )}
        </div>
      </div>
      {view.deadline && (
        <div className="mx-auto mt-2 h-1 max-w-[1500px] overflow-hidden rounded-full bg-line">
          <div className={`h-full transition-[width] duration-300 ease-linear ${urgent ? 'bg-blood' : 'bg-gold'}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </header>
  );
}
