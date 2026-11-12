'use client';

import { MessageCircle, Send, Skull, VenetianMask } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useGame } from '@/lib/store';

const CHANNEL = {
  public: { label: null, Icon: null, cls: '' },
  mafia: { label: 'Mafia', Icon: VenetianMask, cls: 'text-blood' },
  dead: { label: 'Dead', Icon: Skull, cls: 'text-mute' },
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
      <h2 className="label flex items-center gap-1.5 px-1">
        <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" /> Table talk
      </h2>
      <ul className="min-h-[120px] flex-1 space-y-2 overflow-y-auto px-1 text-sm" aria-live="polite">
        {chat.length === 0 && <li className="py-4 text-center font-semibold text-mute">Quiet so far. Someone say something.</li>}
        {chat.map((m) => {
          const c = CHANNEL[m.channel] ?? CHANNEL.public;
          const mine = m.from === view.youId;
          return (
            <li key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
              <span className="flex items-center gap-1 px-1 text-xs font-bold text-mute">
                {c.Icon && <c.Icon className={`h-3 w-3 ${c.cls}`} aria-hidden="true" />}
                {c.label && <span className={c.cls}>{c.label}</span>}
                {m.name}
              </span>
              <span
                className={`max-w-[92%] break-words rounded-2xl border-2 px-3 py-1.5 ${
                  mine ? 'rounded-br-sm border-gold/60 bg-gold/15' : 'rounded-bl-sm border-line bg-panel-2'
                } ${m.channel === 'mafia' ? '!border-blood/60 !bg-blood/10' : ''}`}
              >
                {m.text}
              </span>
            </li>
          );
        })}
        <div ref={endRef} />
      </ul>
      <form onSubmit={submit} className="mt-2 flex gap-2">
        <input
          className="input !min-h-11 !py-2 text-sm"
          maxLength={300}
          disabled={!channel}
          aria-label="Chat message"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={channel ? PLACEHOLDER[channel] : 'Chat is closed right now'}
        />
        <button className="btn-gold !min-h-11 !px-3.5" disabled={!channel || !text.trim()} aria-label="Send message">
          <Send className="h-5 w-5" aria-hidden="true" />
        </button>
      </form>
      {error && <p role="alert" className="mt-1 px-1 text-xs font-semibold text-blood">{error}</p>}
    </section>
  );
}
