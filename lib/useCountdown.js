'use client';

import { useEffect, useState } from 'react';
import { useGame } from './store';

/**
 * Milliseconds remaining until `deadline` (server clock), updated 4x a second.
 * While `paused` is true the clock is frozen at `remainingMs` (sent by the server).
 */
export function useCountdown(deadline, { paused = false, remainingMs = null } = {}) {
  const offset = useGame((s) => s.clockOffset);
  const calc = () => {
    if (paused) return remainingMs ?? 0;
    return deadline ? Math.max(0, deadline - (Date.now() + offset)) : 0;
  };
  const [ms, setMs] = useState(calc);

  useEffect(() => {
    setMs(calc());
    if (!deadline || paused) return;
    const t = setInterval(() => setMs(calc()), 250);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadline, paused, remainingMs, offset]);

  return ms;
}

export const clock = (ms) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
