'use client';

import { useState } from 'react';
import { MAX_PLAYERS, MIN_PLAYERS } from '@/server/engine/constants';
import { validateSettings } from '@/server/engine/settings';
import { useGame } from '@/lib/store';
import SettingsPanel from './SettingsPanel';
import MediaControls from './media/MediaControls';

export default function Lobby({ view }) {
  const { startGame, kick, leave } = useGame();
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const isHost = view.hostId === view.youId;
  const count = view.players.length;
  const problem = validateSettings(count, view.settings);

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
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">Room code</p>
          <button onClick={() => copy('code')} className="font-mono text-5xl font-bold tracking-[0.3em] text-gold hover:opacity-80" title="Copy code">
            {view.code}
          </button>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => copy('link')}>{copied === 'link' ? 'Link copied ✓' : 'Copy invite link'}</button>
          <button className="btn-ghost" onClick={leave}>Leave</button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl">Players</h2>
            <span className="text-sm text-mute">{count} / {MAX_PLAYERS} · need {MIN_PLAYERS}+</span>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {view.players.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-xl border border-line bg-panel-2 px-4 py-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blood/20 font-display text-lg text-blood">
                  {p.name[0].toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {p.name}
                    {p.id === view.youId && <span className="ml-1 text-xs text-mute">(you)</span>}
                  </p>
                  <p className="text-xs text-mute">
                    {p.isHost ? '👑 Host' : 'Player'} · {p.connected ? 'online' : 'reconnecting…'}
                  </p>
                </div>
                {isHost && !p.isHost && (
                  <button className="text-xs text-mute hover:text-blood" onClick={() => kick(p.id)}>Remove</button>
                )}
              </li>
            ))}
            {Array.from({ length: Math.max(0, MIN_PLAYERS - count) }).map((_, i) => (
              <li key={`e${i}`} className="flex h-[66px] items-center justify-center rounded-xl border border-dashed border-line text-sm text-mute">
                Waiting for player…
              </li>
            ))}
          </ul>
        </section>

        <aside className="space-y-4">
          <MediaControls view={view} preview />
          <SettingsPanel view={view} isHost={isHost} />
          {isHost ? (
            <div>
              <button className="btn-primary w-full text-lg" disabled={!!problem} onClick={start}>Start game</button>
              {(problem || error) && <p className="mt-2 text-center text-sm text-gold">{error || problem}</p>}
            </div>
          ) : (
            <p className="text-center text-sm text-mute">Waiting for the host to start the game…</p>
          )}
        </aside>
      </div>
    </main>
  );
}
