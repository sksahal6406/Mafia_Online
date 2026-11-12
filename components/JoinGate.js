'use client';

import { ArrowLeft, DoorOpen, TriangleAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { loadName } from '@/lib/session';
import { useGame } from '@/lib/store';
import { Avatar } from './ui/icons';

export default function JoinGate({ code }) {
  const router = useRouter();
  const joinRoom = useGame((s) => s.joinRoom);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => setName(loadName()), []);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return setError('Pick a name so the table knows who you are.');
    setBusy(true);
    setError('');
    try {
      const res = await joinRoom(code, name);
      if (!res.ok) setError(res.error);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-5 !p-6">
        <div className="text-center">
          <p className="label">You're invited to</p>
          <p className="inline-block -rotate-2 rounded-xl border-2 border-dashed border-gold bg-gold/10 px-5 py-2 font-mono text-4xl font-bold tracking-[0.3em] text-gold">
            {code}
          </p>
        </div>
        <div>
          <label className="label" htmlFor="jname">Your name</label>
          <div className="flex items-center gap-3">
            <Avatar name={name || '?'} className="h-12 w-12 text-xl" />
            <input id="jname" className="input" maxLength={20} autoFocus autoComplete="nickname" value={name} onChange={(e) => setName(e.target.value)} placeholder="What should we call you?" />
          </div>
        </div>
        <button className="btn-primary w-full text-xl" disabled={busy}>
          <DoorOpen className="h-5 w-5" aria-hidden="true" /> Take a seat
        </button>
        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-xl border-2 border-blood/50 bg-blood/10 px-3 py-2 text-sm font-semibold">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-blood" aria-hidden="true" /> {error}
          </p>
        )}
        <button type="button" className="flex w-full items-center justify-center gap-1 text-sm font-semibold text-mute hover:text-bone" onClick={() => router.push('/')}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back home
        </button>
      </form>
    </main>
  );
}
