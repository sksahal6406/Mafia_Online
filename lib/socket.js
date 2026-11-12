import { io } from 'socket.io-client';

let socket;

/** Single shared client socket (browser only). */
export function getSocket() {
  if (!socket) socket = io({ autoConnect: false, transports: ['websocket', 'polling'] });
  return socket;
}

export function emit(event, payload) {
  return new Promise((resolve) => {
    const s = getSocket();
    const timer = setTimeout(() => resolve({ ok: false, error: 'No response from server.' }), 8000);
    s.emit(event, payload, (res) => {
      clearTimeout(timer);
      resolve(res ?? { ok: false, error: 'No response from server.' });
    });
  });
}

export function ensureConnected() {
  const s = getSocket();
  if (s.connected) return Promise.resolve(s);
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Could not reach the server.')), 8000);
    s.once('connect', () => {
      clearTimeout(t);
      resolve(s);
    });
    s.connect();
  });
}
