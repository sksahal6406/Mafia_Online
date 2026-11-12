'use client';

import { useEffect, useRef } from 'react';

/** A silent <video> (audio plays through RemoteAudio so the policy can mute it centrally). */
export default function TileVideo({ stream, mirror = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.srcObject !== stream) el.srcObject = stream;
    el.play?.().catch(() => {});
  }, [stream]);
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted
      className={`h-full w-full object-cover ${mirror ? '-scale-x-100' : ''}`}
    />
  );
}
