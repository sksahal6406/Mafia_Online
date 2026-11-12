import { create } from 'zustand';
import { clearSession, loadSession, saveName, saveSession } from './session';
import { emit, ensureConnected, getSocket } from './socket';

let wired = false;

export const useGame = create((set, get) => ({
  status: 'idle', // idle | connecting | joined | disconnected
  error: null,
  code: null,
  view: null,
  chat: [],
  clockOffset: 0, // serverNow - Date.now()
  kicked: false,

  /** Attach socket listeners once. */
  wire() {
    if (wired) return;
    wired = true;
    const s = getSocket();
    window.__mafia = { socket: s, store: useGame };
    s.on('state:update', (view) => {
      set({ view, status: 'joined', clockOffset: view.serverNow - Date.now() });
    });
    s.on('chat:message', (msg) => set((st) => ({ chat: [...st.chat, msg].slice(-200) })));
    s.on('chat:history', (chat) => set({ chat }));
    s.on('room:kicked', () => {
      const { code } = get();
      if (code) clearSession(code);
      set({ kicked: true, view: null, status: 'idle' });
    });
    s.on('disconnect', (reason) => console.warn('[socket] disconnected:', reason));
    s.on('disconnect', () => set((st) => (st.status === 'joined' ? { status: 'disconnected' } : st)));
    s.io.on('reconnect', () => {
      const { code } = get();
      const session = code && loadSession(code);
      if (session) emit('room:rejoin', { code, token: session.token });
    });
  },

  async createRoom(name) {
    await ensureConnected();
    const res = await emit('room:create', { name });
    if (res.ok) {
      saveName(name);
      saveSession(res.code, { token: res.token, playerId: res.playerId });
      set({ code: res.code, status: 'joined', error: null, kicked: false });
    }
    return res;
  },

  async joinRoom(code, name) {
    await ensureConnected();
    const res = await emit('room:join', { code, name });
    if (res.ok) {
      saveName(name);
      saveSession(res.code, { token: res.token, playerId: res.playerId });
      set({ code: res.code, status: 'joined', error: null, kicked: false });
    }
    return res;
  },

  /** Try to reclaim a seat from a saved session. Returns true if successful. */
  async rejoin(code) {
    const session = loadSession(code);
    if (!session) return false;
    set({ status: 'connecting', code });
    try {
      await ensureConnected();
    } catch (e) {
      set({ status: 'idle', error: e.message });
      return false;
    }
    const res = await emit('room:rejoin', { code, token: session.token });
    if (!res.ok) {
      clearSession(code);
      set({ status: 'idle', code });
      return false;
    }
    set({ status: 'joined', code, kicked: false });
    return true;
  },

  leave() {
    const { code } = get();
    if (code) clearSession(code);
    getSocket().disconnect();
    set({ status: 'idle', view: null, chat: [], code: null });
  },

  updateSettings: (patch) => emit('room:settings', patch),
  startGame: () => emit('game:start', {}),
  resetGame: () => emit('game:reset', {}),
  kick: (playerId) => emit('host:kick', { playerId }),
  muteToggle: (playerId, muted) => emit('host:mute', { playerId, muted }),
  act: (action) => emit('game:act', action),
  sendChat: (text) => emit('chat:send', { text }),
}));
