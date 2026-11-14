'use client';

import { Pause, Play, Plus, SkipForward, Users } from 'lucide-react';
import { phaseTitle } from '@/lib/phases';
import { useGame } from '@/lib/store';
import { clock, useCountdown } from '@/lib/useCountdown';
import { PhaseIcon } from '../ui/icons';

export default function PhaseBar({ view, night }) {
  const { skipPhase, pauseTimer, resumeTimer, extendTimer } = useGame();
  const { title, subtitle } = phaseTitle(view.phase);
  const ms = useCountdown(view.deadline, { paused: view.paused, remainingMs: view.pausedRemainingMs });
  const total = Math.max(view.phaseDuration * 1000, ms, 1);
  const pct = view.deadline ? Math.min(100, (ms / total) * 100) : 0;
  const urgent = view.deadline && !view.paused && ms < 10_000;
  const alive = view.players.filter((p) => p.alive).length;
  const isHost = view.hostId === view.youId;
  const showControls = isHost && view.timerControllable;

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
                urgent ? 'animate-pulse border-blood bg-blood/15 text-blood' : view.paused ? 'border-gold bg-gold/15 text-gold' : 'border-line bg-panel-2 text-bone'
              }`}
            >
              {view.paused ? 'Paused' : clock(ms)}
            </span>
          )}
          {showControls && (
            <div className="flex items-center gap-1.5">
              {view.paused ? (
                <button
                  className="chip cursor-pointer hover:bg-gold/20"
                  title="Resume the timer"
                  onClick={() => resumeTimer()}
                >
                  <Play className="h-3.5 w-3.5" aria-hidden="true" /> Resume
                </button>
              ) : (
                <button
                  className="chip cursor-pointer hover:bg-gold/20"
                  title="Pause the timer"
                  onClick={() => pauseTimer()}
                >
                  <Pause className="h-3.5 w-3.5" aria-hidden="true" /> Pause
                </button>
              )}
              <button
                className="chip cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 hover:bg-gold/20"
                title="Add 30 seconds"
                disabled={view.extendsLeft <= 0}
                onClick={() => extendTimer(30_000)}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" /> 30s
              </button>
              <button
                className="chip cursor-pointer hover:bg-gold/20"
                title="Skip to the next phase"
                onClick={() => skipPhase()}
              >
                <SkipForward className="h-3.5 w-3.5" aria-hidden="true" /> Skip
              </button>
            </div>
          )}
        </div>
      </div>
      {view.deadline && (
        <div className="mx-auto mt-3 h-2 max-w-[1500px] overflow-hidden rounded-full border border-black bg-line">
          <div
            className={`h-full rounded-full transition-[width] duration-300 ease-linear ${urgent ? 'bg-blood' : view.paused ? 'bg-gold/50' : 'bg-gold'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </header>
  );
}
