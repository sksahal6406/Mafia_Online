'use client';

import { Moon, MousePointerClick, Skull, Syringe, VenetianMask, Eye, CircleCheck } from 'lucide-react';
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
        <p className="font-display text-2xl font-semibold">{mode.title}</p>
        <p className="text-sm text-mute">{mode.hint}</p>

        {mode.result && (
          <p className={`mt-3 flex items-center gap-2 rounded-xl border-2 px-4 py-3 text-lg font-bold ${mode.result.isMafia ? 'border-blood bg-blood/15 text-blood' : 'border-town bg-town/15 text-town'}`}>
            {mode.result.isMafia ? <VenetianMask className="h-6 w-6" aria-hidden="true" /> : <CircleCheck className="h-6 w-6" aria-hidden="true" />}
            {name(mode.result.target)} is {mode.result.isMafia ? 'MAFIA' : 'NOT Mafia'}
          </p>
        )}

        {!mode.result && (
          <p className="mt-3 flex items-center gap-2 text-sm font-semibold">
            <MousePointerClick className="h-4 w-4 text-gold" aria-hidden="true" />
            {pickedName ? <>Your pick: <b className="text-gold">{pickedName}</b></> : mode.abstained ? 'You abstained.' : 'Tap a player above.'}
          </p>
        )}

        {mode.type === 'vote' && view.day && (
          <p className="mt-1 text-xs text-mute">{view.day.voted} of {players.filter((p) => p.alive).length} have voted</p>
        )}

        {mode.allowAbstain && (
          <button className="btn-ghost mt-3 !min-h-10 !py-1.5 text-base" disabled={mode.abstained} onClick={() => act({ type: 'vote', target: null })}>
            Abstain
          </button>
        )}
      </Panel>
    );
  }

  if (isNight(phase)) {
    return (
      <Panel tone="night">
        <p className="flex items-center gap-2 font-display text-2xl font-semibold"><Moon className="h-6 w-6 text-night" aria-hidden="true" /> Night has fallen</p>
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
    <div className={`rounded-2xl border-2 p-4 shadow-[3px_3px_0_0_#000] ${tone === 'night' ? 'border-night/50 bg-night/10' : 'border-gold/60 bg-gold/10'}`}>{children}</div>
  );
}

function Spectating({ view, name }) {
  const n = view.private?.night;
  const row = 'flex items-center gap-2';
  return (
    <Panel tone="night">
      <p className="flex items-center gap-2 font-display text-2xl font-semibold"><Skull className="h-6 w-6" aria-hidden="true" /> You are out. Watch in silence.</p>
      <p className="text-sm text-mute">You cannot speak, vote or act, but you can see everything.</p>
      {n && isNight(view.phase) && (
        <ul className="mt-3 space-y-1.5 text-sm font-semibold">
          {Object.entries(n.mafiaVotes ?? {}).map(([m, t]) => (
            <li key={m} className={row}><VenetianMask className="h-4 w-4 text-blood" aria-hidden="true" /> {name(m)} → {name(t)}</li>
          ))}
          {Object.entries(n.protects ?? {}).map(([d, t]) => (
            <li key={d} className={row}><Syringe className="h-4 w-4 text-town" aria-hidden="true" /> {name(d)} protects {name(t)}</li>
          ))}
          {Object.entries(n.results ?? {}).map(([d, r]) => (
            <li key={d} className={row}><Eye className="h-4 w-4 text-night" aria-hidden="true" /> {name(d)} checks {name(r.target)}: {r.isMafia ? 'Mafia' : 'Not Mafia'}</li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
