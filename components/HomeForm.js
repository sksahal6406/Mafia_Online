'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { loadName } from '@/lib/session';
import { useGame } from '@/lib/store';

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
    if (!name.trim()) return setError('Enter your name first.');
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
    <div className="card w-full max-w-md space-y-5">
      <div>
        <label className="label" htmlFor="name">Your name</label>
        <input
          id="name"
          className="input"
          placeholder="What should we call you?"
          maxLength={20}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <button className="btn-primary w-full" disabled={busy} onClick={() => run(() => createRoom(name))}>
        Create a room
      </button>

      <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-mute">
        <span className="h-px flex-1 bg-line" /> or join one <span className="h-px flex-1 bg-line" />
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => joinRoom(code.trim().toUpperCase(), name));
        }}
      >
        <input
          className="input text-center font-mono text-lg uppercase tracking-[0.3em]"
          placeholder="CODE"
          maxLength={5}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
        <button className="btn-ghost" disabled={busy || code.length < 5}>Join</button>
      </form>

      {error && <p className="rounded-lg bg-blood/10 px-3 py-2 text-sm text-blood">{error}</p>}
    </div>
  );
}
