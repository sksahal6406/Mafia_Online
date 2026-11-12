'use client';

import { useGame } from '@/lib/store';

const fmt = (s) => (s >= 60 ? `${Math.floor(s / 60)}m${s % 60 ? ` ${s % 60}s` : ''}` : `${s}s`);

function Stepper({ label, value, onChange, step = 1, min, max, format = String, disabled }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <button className="h-8 w-8 rounded-lg border border-line bg-panel-2 text-lg leading-none hover:border-mute disabled:opacity-30"
          disabled={disabled || value <= min} onClick={() => onChange(value - step)} aria-label={`Decrease ${label}`}>−</button>
        <span className="w-14 text-center font-mono text-sm">{format(value)}</span>
        <button className="h-8 w-8 rounded-lg border border-line bg-panel-2 text-lg leading-none hover:border-mute disabled:opacity-30"
          disabled={disabled || value >= max} onClick={() => onChange(value + step)} aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}

export default function SettingsPanel({ view, isHost }) {
  const updateSettings = useGame((s) => s.updateSettings);
  const { settings: s, players } = view;
  const civilians = Math.max(0, players.length - s.mafia - s.doctor - s.detective);
  const set = (patch) => updateSettings(patch);
  const setTimer = (key) => (v) => set({ timers: { [key]: v } });
  const off = !isHost;

  return (
    <section className="card">
      <h2 className="mb-1 font-display text-2xl">Game rules</h2>
      <p className="mb-3 text-xs text-mute">{isHost ? 'You control these settings.' : 'Only the host can change these.'}</p>

      <div className="divide-y divide-line">
        <div>
          <Stepper label="🔪 Mafia" value={s.mafia} min={1} max={4} disabled={off} onChange={(v) => set({ mafia: v })} />
          <Stepper label="💉 Doctors" value={s.doctor} min={0} max={2} disabled={off} onChange={(v) => set({ doctor: v })} />
          <Stepper label="🔍 Detectives" value={s.detective} min={0} max={2} disabled={off} onChange={(v) => set({ detective: v })} />
          <div className="flex justify-between py-2 text-sm text-mute">
            <span>👤 Civilians</span>
            <span className="pr-2 font-mono">{civilians}</span>
          </div>
        </div>
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm">📹 Allow video</p>
            <p className="text-xs text-mute">{s.video ? "Cameras and mics" : "Audio only, no cameras"}</p>
          </div>
          <button role="switch" aria-checked={s.video} disabled={off} onClick={() => set({ video: !s.video })}
            className={`relative h-7 w-12 rounded-full transition disabled:opacity-50 ${s.video ? "bg-blood" : "bg-line"}`}>
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${s.video ? "left-6" : "left-1"}`} />
          </button>
        </div>
        <div className="pt-2">
          <Stepper label="Night action" value={s.timers.night} min={15} max={120} step={5} format={fmt} disabled={off} onChange={setTimer('night')} />
          <Stepper label="Discussion" value={s.timers.discussion} min={30} max={600} step={15} format={fmt} disabled={off} onChange={setTimer('discussion')} />
          <Stepper label="Voting" value={s.timers.vote} min={10} max={120} step={5} format={fmt} disabled={off} onChange={setTimer('vote')} />
          <Stepper label="Revote talk" value={s.timers.revoteDiscussion} min={10} max={120} step={5} format={fmt} disabled={off} onChange={setTimer('revoteDiscussion')} />
        </div>
      </div>
    </section>
  );
}
