'use client';

import { Minus, Plus, Video, VideoOff } from 'lucide-react';
import { useGame } from '@/lib/store';
import { RoleIcon } from './ui/icons';
import { ROLE_INFO } from '@/lib/roles';

const fmt = (s) => (s >= 60 ? `${Math.floor(s / 60)}m${s % 60 ? ` ${s % 60}s` : ''}` : `${s}s`);

const stepBtn =
  'flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border-2 border-line bg-panel-2 transition hover:border-gold hover:text-gold disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-line disabled:hover:text-inherit';

function Stepper({ label, icon, role, value, onChange, step = 1, min, max, format = String, disabled }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="flex items-center gap-2 text-sm font-semibold">
        {role && <RoleIcon role={role} className={`h-4 w-4 ${ROLE_INFO[role].color}`} />}
        {label}
      </span>
      <div className="flex items-center gap-2">
        <button className={stepBtn} disabled={disabled || value <= min} onClick={() => onChange(value - step)} aria-label={`Decrease ${label}`}>
          <Minus className="h-4 w-4" aria-hidden="true" />
        </button>
        <span className="w-12 text-center font-mono text-sm font-bold" aria-live="polite">{format(value)}</span>
        <button className={stepBtn} disabled={disabled || value >= max} onClick={() => onChange(value + step)} aria-label={`Increase ${label}`}>
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
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
      <h2 className="font-display text-2xl font-semibold">Game rules</h2>
      <p className="mb-3 text-xs text-mute">{isHost ? 'You are the host, so these are yours to change.' : 'Only the host can change these.'}</p>

      <div className="divide-y-2 divide-line">
        <div className="pb-2">
          <Stepper label="Mafia" role="mafia" value={s.mafia} min={1} max={4} disabled={off} onChange={(v) => set({ mafia: v })} />
          <Stepper label="Doctors" role="doctor" value={s.doctor} min={0} max={2} disabled={off} onChange={(v) => set({ doctor: v })} />
          <Stepper label="Detectives" role="detective" value={s.detective} min={0} max={2} disabled={off} onChange={(v) => set({ detective: v })} />
          <div className="flex items-center justify-between py-1.5 text-sm text-mute">
            <span className="flex items-center gap-2 font-semibold"><RoleIcon role="civilian" className="h-4 w-4" /> Civilians (the rest)</span>
            <span className="pr-1 font-mono font-bold">{civilians}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-2">
            {s.video ? <Video className="h-5 w-5 text-town" aria-hidden="true" /> : <VideoOff className="h-5 w-5 text-mute" aria-hidden="true" />}
            <div>
              <p className="text-sm font-semibold">Video</p>
              <p className="text-xs text-mute">{s.video ? 'Cameras and mics' : 'Audio only, no cameras'}</p>
            </div>
          </div>
          <button
            role="switch"
            aria-checked={s.video}
            aria-label="Allow video"
            disabled={off}
            onClick={() => set({ video: !s.video })}
            className={`relative h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-black transition disabled:cursor-not-allowed disabled:opacity-50 ${s.video ? 'bg-town' : 'bg-line'}`}
          >
            <span className={`absolute top-0.5 h-6 w-6 rounded-full border-2 border-black bg-bone transition-all ${s.video ? 'left-[1.5rem]' : 'left-0.5'}`} />
          </button>
        </div>

        <div className="pt-2">
          <p className="label mt-1">Timers</p>
          <Stepper label="Night action" value={s.timers.night} min={15} max={120} step={5} format={fmt} disabled={off} onChange={setTimer('night')} />
          <Stepper label="Discussion" value={s.timers.discussion} min={30} max={600} step={15} format={fmt} disabled={off} onChange={setTimer('discussion')} />
          <Stepper label="Voting" value={s.timers.vote} min={10} max={120} step={5} format={fmt} disabled={off} onChange={setTimer('vote')} />
          <Stepper label="Revote talk" value={s.timers.revoteDiscussion} min={10} max={120} step={5} format={fmt} disabled={off} onChange={setTimer('revoteDiscussion')} />
        </div>
      </div>
    </section>
  );
}
