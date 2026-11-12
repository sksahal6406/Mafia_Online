// Seat tokens live in localStorage so a refresh can reclaim the seat.
const key = (code) => `mafia:session:${code}`;

export function loadSession(code) {
  try {
    return JSON.parse(localStorage.getItem(key(code)) ?? 'null');
  } catch {
    return null;
  }
}

export function saveSession(code, session) {
  try {
    localStorage.setItem(key(code), JSON.stringify(session));
  } catch {}
}

export function clearSession(code) {
  try {
    localStorage.removeItem(key(code));
  } catch {}
}

export function loadName() {
  try {
    return localStorage.getItem('mafia:name') ?? '';
  } catch {
    return '';
  }
}

export function saveName(name) {
  try {
    localStorage.setItem('mafia:name', name);
  } catch {}
}
