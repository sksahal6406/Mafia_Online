'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { loadName } from '@/lib/session';
import { useGame } from '@/lib/store';

export default function JoinGate({ code }) {
  const router = useRouter();
  const joinRoom = useGame((s) => s.joinRoom);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => setName(loadName()), []);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return setError('Enter your name.');
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
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4">
        <div className="text-center">
          <p className="label">You are invited to room</p>
          <p className="font-mono text-4xl font-bold tracking-[0.3em] text-gold">{code}</p>
        </div>
        <div>
          <label className="label" htmlFor="jname">Your name</label>
          <input id="jname" className="input" maxLength={20} autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Pick a name" />
        </div>
        <button className="btn-primary w-full" disabled={busy}>Join room</button>
        {error && <p className="rounded-lg bg-blood/10 px-3 py-2 text-sm text-blood">{error}</p>}
        <button type="button" className="w-full text-sm text-mute hover:text-bone" onClick={() => router.push('/')}>
          Back home
        </button>
      </form>
    </main>
  );
}
