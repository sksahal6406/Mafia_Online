'use client';

import { useGame } from '@/lib/store';
import { isNight } from '@/lib/phases';

/** Instructions + extra controls for whatever the player must do right now. */
export default function ActionPanel({ view, mode }) {
  const act = useGame((s) => s.act);
  const { you, phase, players } = view;
  const name = (id) => players.find((p) => p.id === id)?.name ?? '?';

  if (you?.spectator && phase !== 'game_over') return <Spectating view={view} name={name} />;

  if (mode) {
    const pickedName = mode.selected ? name(mode.selected) : null;
    return (
      <Panel tone={isNight(phase) ? 'night' : 'day'}>
        <p className="font-display text-xl">{mode.title}</p>
        <p className="text-sm text-mute">{mode.hint}</p>

        {mode.result && (
          <p className={`mt-3 rounded-xl px-4 py-3 text-lg font-semibold ${mode.result.isMafia ? 'bg-blood/20 text-blood' : 'bg-town/15 text-town'}`}>
            {name(mode.result.target)} is {mode.result.isMafia ? 'MAFIA 🔪' : 'NOT Mafia ✅'}
          </p>
        )}

        {!mode.result && (
          <p className="mt-2 text-sm">
            {pickedName ? <>Your pick: <b className="text-gold">{pickedName}</b></> : mode.abstained ? 'You abstained.' : 'Click a player above.'}
          </p>
        )}

        {mode.type === 'vote' && view.day && (
          <p className="mt-1 text-xs text-mute">{view.day.voted} of {players.filter((p) => p.alive).length} have voted</p>
        )}

        {mode.allowAbstain && (
          <button className="btn-ghost mt-3 !py-2 text-sm" disabled={mode.abstained} onClick={() => act({ type: 'vote', target: null })}>
            Abstain
          </button>
        )}
      </Panel>
    );
  }

  if (isNight(phase)) {
    return (
      <Panel tone="night">
        <p className="font-display text-xl">🌙 Night has fallen</p>
        <p className="text-sm text-mute">
          {you?.role === 'civilian' ? 'Close your eyes and stay silent.' : 'Wait quietly. Your turn will come, or the night will pass.'}
        </p>
      </Panel>
    );
  }

  return null;
}

function Panel({ tone, children }) {
  return (
    <div className={`rounded-2xl border p-4 ${tone === 'night' ? 'border-night/30 bg-night/5' : 'border-gold/30 bg-gold/5'}`}>{children}</div>
  );
}

function Spectating({ view, name }) {
  const n = view.private?.night;
  return (
    <Panel tone="night">
      <p className="font-display text-xl">💀 You are out. Watch in silence.</p>
      <p className="text-sm text-mute">You cannot speak, vote or act, but you can see everything.</p>
      {n && isNight(view.phase) && (
        <ul className="mt-3 space-y-1 text-sm">
          {Object.entries(n.mafiaVotes ?? {}).map(([m, t]) => (
            <li key={m}>🔪 {name(m)} → {name(t)}</li>
          ))}
          {Object.entries(n.protects ?? {}).map(([d, t]) => (
            <li key={d}>💉 {name(d)} protects {name(t)}</li>
          ))}
          {Object.entries(n.results ?? {}).map(([d, r]) => (
            <li key={d}>🔍 {name(d)} checks {name(r.target)}: {r.isMafia ? 'Mafia' : 'Not Mafia'}</li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
