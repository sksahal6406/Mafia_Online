'use client';

import { useEffect, useRef } from 'react';
import { useMedia } from '@/lib/webrtc/mediaStore';

function AudioEl({ id, stream, muted }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.srcObject !== stream) el.srcObject = stream;
    el.play?.().catch(() => {});
  }, [stream]);
  return <audio ref={ref} autoPlay muted={muted} data-peer={id} data-muted={muted ? 'true' : 'false'} />;
}

/**
 * Plays every peer's audio. The server's policy decides whose audio we may hear;
 * everyone else stays muted (never unmounted, so reconnection stays instant).
 */
export default function RemoteAudio({ view }) {
  const remote = useMedia((s) => s.remote);
  return (
    <div hidden>
      {view.players
        .filter((p) => p.id !== view.youId && remote[p.id])
        .map((p) => (
          <AudioEl key={p.id} id={p.id} stream={remote[p.id].stream} muted={!view.media.receiveFrom.includes(p.id)} />
        ))}
    </div>
  );
}
