'use client';

import { Check, Copy, Crown, Link as LinkIcon, LogOut, Play, UserX, WifiOff } from 'lucide-react';
import { useState } from 'react';
import { MAX_PLAYERS, MIN_PLAYERS } from '@/server/engine/constants';
import { validateSettings } from '@/server/engine/settings';
import { useGame } from '@/lib/store';
import SettingsPanel from './SettingsPanel';
import MediaControls from './media/MediaControls';
import { Avatar } from './ui/icons';

export default function Lobby({ view }) {
  const { startGame, kick, leave } = useGame();
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const isHost = view.hostId === view.youId;
  const count = view.players.length;
  const problem = validateSettings(count, view.settings);
  const missing = Math.max(0, MIN_PLAYERS - count);

  async function copy(kind) {
    const text = kind === 'code' ? view.code : `${window.location.origin}/room/${view.code}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(''), 1500);
    } catch {}
  }

  async function start() {
    setError('');
    const res = await startGame();
    if (!res.ok) setError(res.error);
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:py-8">
      <header className="card mb-6 flex flex-wrap items-center justify-between gap-4 !border-gold/50">
        <div className="flex items-center gap-4">
          <button
            onClick={() => copy('code')}
            title="Copy room code"
            className="group -rotate-1 cursor-pointer rounded-xl border-2 border-dashed border-gold bg-gold/10 px-4 py-2 text-left transition hover:rotate-0"
          >
            <span className="block text-[0.65rem] font-bold uppercase tracking-[0.18em] text-gold/80">Room code</span>
            <span className="flex items-center gap-2 font-mono text-4xl font-bold tracking-[0.25em] text-gold">
              {view.code}
              {copied === 'code' ? <Check className="h-5 w-5" aria-hidden="true" /> : <Copy className="h-5 w-5 opacity-50 group-hover:opacity-100" aria-hidden="true" />}
            </span>
          </button>
          <p className="hidden max-w-[14rem] text-sm text-mute sm:block">
            Send this code or the invite link to your friends. They can join from any device.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-gold" onClick={() => copy('link')}>
            {copied === 'link' ? <Check className="h-5 w-5" aria-hidden="true" /> : <LinkIcon className="h-5 w-5" aria-hidden="true" />}
            {copied === 'link' ? 'Copied!' : 'Invite link'}
          </button>
          <button className="btn-ghost" onClick={leave}>
            <LogOut className="h-5 w-5" aria-hidden="true" /> Leave
          </button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="card self-start">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-semibold">Around the table</h2>
            <span className="chip" aria-live="polite">{count} / {MAX_PLAYERS}</span>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2">
            {view.players.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-xl border-2 border-line bg-panel-2 px-3 py-3 shadow-[2px_2px_0_0_#000]">
                <Avatar name={p.name} className="h-11 w-11 text-xl" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-lg font-semibold leading-tight">
                    {p.name}
                    {p.id === view.youId && <span className="ml-1.5 text-xs font-bold text-gold">YOU</span>}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-mute">
                    {p.isHost && <Crown className="h-3.5 w-3.5 text-gold" aria-hidden="true" />}
                    {p.isHost ? 'Host' : 'Player'}
                    {!p.connected && <span className="ml-1 flex items-center gap-1 text-gold"><WifiOff className="h-3.5 w-3.5" aria-hidden="true" /> reconnecting</span>}
                  </p>
                </div>
                {isHost && !p.isHost && (
                  <button
                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-mute transition hover:bg-blood/15 hover:text-blood"
                    onClick={() => kick(p.id)}
                    aria-label={`Remove ${p.name}`}
                    title="Remove from room"
                  >
                    <UserX className="h-5 w-5" aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
            {Array.from({ length: missing }).map((_, i) => (
              <li key={`e${i}`} className="flex h-[74px] items-center justify-center rounded-xl border-2 border-dashed border-line text-sm font-semibold text-mute">
                Empty seat
              </li>
            ))}
          </ul>

          <p className="mt-4 text-sm text-mute">
            {missing > 0 ? `Need ${missing} more ${missing === 1 ? 'player' : 'players'} to start.` : 'Enough players. Ready when you are.'}
          </p>
        </section>

        <aside className="space-y-4">
          <MediaControls view={view} preview />
          <SettingsPanel view={view} isHost={isHost} />
          {isHost ? (
            <div>
              <button className="btn-primary w-full !py-4 text-2xl" disabled={!!problem} onClick={start}>
                <Play className="h-6 w-6" aria-hidden="true" /> Start game
              </button>
              {(problem || error) && <p role="alert" className="mt-3 text-center text-sm font-semibold text-gold">{error || problem}</p>}
            </div>
          ) : (
            <p className="card text-center text-sm font-semibold text-mute">Waiting for the host to start the game…</p>
          )}
        </aside>
      </div>
    </main>
  );
}
