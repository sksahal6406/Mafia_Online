'use client';

import { Loader2, WifiOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useGame } from '@/lib/store';
import JoinGate from './JoinGate';
import Lobby from './Lobby';
import GameScreen from './game/GameScreen';
import RemoteAudio from './media/RemoteAudio';
import { useMeshSync } from '@/lib/webrtc/useMesh';

export default function RoomClient({ code }) {
  const router = useRouter();
  const { wire, rejoin, view, status, kicked } = useGame();
  const [checked, setChecked] = useState(false);
  useMeshSync(view);

  useEffect(() => {
    wire();
    let live = true;
    const current = useGame.getState();
    // Arriving from the home page: the socket is already seated in this room.
    if (current.view && current.code === code) {
      setChecked(true);
      return;
    }
    rejoin(code).then(() => live && setChecked(true));
    return () => {
      live = false;
    };
  }, [code, wire, rejoin]);

  if (kicked) {
    return (
      <Centered>
        <p className="mb-4 font-display text-2xl font-semibold">The host showed you the door.</p>
        <button className="btn-primary" onClick={() => router.push('/')}>Back home</button>
      </Centered>
    );
  }
  if (!checked) return <Centered><p className="flex items-center gap-2 font-semibold text-mute"><Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Finding your seat…</p></Centered>;
  if (!view) return <JoinGate code={code} />;

  return (
    <>
      {status === 'disconnected' && (
        <div role="status" className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-gold px-4 py-2 text-center text-sm font-bold text-black">
          <WifiOff className="h-4 w-4" aria-hidden="true" /> Connection lost. Reconnecting…
        </div>
      )}
      <RemoteAudio view={view} />
      {view.phase === 'lobby' ? <Lobby view={view} /> : <GameScreen view={view} />}
    </>
  );
}

function Centered({ children }) {
  return <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">{children}</main>;
}
