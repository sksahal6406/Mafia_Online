'use client';

import { ArrowRight, Plus, TriangleAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { loadName } from '@/lib/session';
import { useGame } from '@/lib/store';
import { Avatar } from './ui/icons';

export default function HomeForm() {
  const router = useRouter();
  const { wire, createRoom, joinRoom } = useGame();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    wire();
    setName(loadName());
  }, [wire]);

  async function run(fn) {
    setError('');
    if (!name.trim()) return setError('Pick a name first so your friends know who you are.');
    setBusy(true);
    try {
      const res = await fn();
      if (res.ok) router.push(`/room/${res.code}`);
      else setError(res.error);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card w-full max-w-md space-y-6 !p-6">
      <div>
        <label className="label" htmlFor="name">1. Who are you?</label>
        <div className="flex items-center gap-3">
          <Avatar name={name || '?'} className="h-12 w-12 text-xl" />
          <input
            id="name"
            className="input"
            placeholder="Your name"
            maxLength={20}
            autoComplete="nickname"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      </div>

      <div>
        <p className="label">2. Start or join</p>
        <button className="btn-primary w-full text-xl" disabled={busy} onClick={() => run(() => createRoom(name))}>
          <Plus className="h-5 w-5" aria-hidden="true" /> Host a new game
        </button>

        <div className="my-4 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-mute">
          <span className="h-0.5 flex-1 bg-line" /> or got a code? <span className="h-0.5 flex-1 bg-line" />
        </div>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => joinRoom(code.trim().toUpperCase(), name));
          }}
        >
          <input
            className="input text-center font-mono text-xl font-bold uppercase tracking-[0.3em]"
            placeholder="ABCDE"
            aria-label="Room code"
            maxLength={5}
            autoCapitalize="characters"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <button className="btn-gold !px-4" disabled={busy || code.length < 5} aria-label="Join room">
            Join <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </form>
      </div>

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl border-2 border-blood/50 bg-blood/10 px-3 py-2 text-sm font-semibold text-bone">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-blood" aria-hidden="true" /> {error}
        </p>
      )}
    </div>
  );
}
