'use client';

import { useEffect, useRef, useState } from 'react';
import { useGame } from '@/lib/store';

const CHANNEL = {
  public: { label: null, cls: '' },
  mafia: { label: '🔪 Mafia', cls: 'text-blood' },
  dead: { label: '💀 Dead', cls: 'text-mute' },
};

const PLACEHOLDER = {
  public: 'Say something to the table…',
  mafia: 'Whisper to the Mafia…',
  dead: 'Chat with the dead…',
};

export default function Chat({ view }) {
  const chat = useGame((s) => s.chat);
  const sendChat = useGame((s) => s.sendChat);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const endRef = useRef(null);
  const channel = view.chatChannel;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [chat.length]);

  async function submit(e) {
    e.preventDefault();
    if (!text.trim() || !channel) return;
    const res = await sendChat(text);
    if (res.ok) {
      setText('');
      setError('');
    } else setError(res.error);
  }

  return (
    <section className="card flex min-h-0 flex-1 flex-col !p-3">
      <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-widest text-mute">Chat</h2>
      <ul className="min-h-[120px] flex-1 space-y-1.5 overflow-y-auto px-1 text-sm">
        {chat.length === 0 && <li className="text-mute">No messages yet.</li>}
        {chat.map((m) => {
          const c = CHANNEL[m.channel] ?? CHANNEL.public;
          return (
            <li key={m.id} className="break-words">
              {c.label && <span className={`mr-1 text-xs font-semibold ${c.cls}`}>{c.label}</span>}
              <b className={m.from === view.youId ? 'text-gold' : ''}>{m.name}:</b> {m.text}
            </li>
          );
        })}
        <div ref={endRef} />
      </ul>
      <form onSubmit={submit} className="mt-2 flex gap-2">
        <input
          className="input !py-2 text-sm"
          maxLength={300}
          disabled={!channel}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={channel ? PLACEHOLDER[channel] : 'Chat is closed right now'}
        />
        <button className="btn-ghost !px-4 !py-2" disabled={!channel || !text.trim()}>Send</button>
      </form>
      {error && <p className="mt-1 px-1 text-xs text-blood">{error}</p>}
    </section>
  );
}
