'use client';

import { useEffect, useState } from 'react';
import { useGame } from './store';

/** Seconds remaining until `deadline` (server clock), updated 4x a second. */
export function useCountdown(deadline) {
  const offset = useGame((s) => s.clockOffset);
  const calc = () => (deadline ? Math.max(0, deadline - (Date.now() + offset)) : 0);
  const [ms, setMs] = useState(calc);

  useEffect(() => {
    setMs(calc());
    if (!deadline) return;
    const t = setInterval(() => setMs(calc()), 250);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadline, offset]);

  return ms;
}

export const clock = (ms) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
