import { RoomManager } from '../rooms/manager.js';
import { viewFor } from '../views/viewFor.js';

/**
 * Wires Socket.IO to the room layer. Every handler validates who is asking
 * and what they may do; the engine validates the game rules themselves.
 */
export function attachSocket(io, opts = {}) {
  const manager = new RoomManager(io, opts);

  io.on('connection', (socket) => {
    const ctx = () => {
      const { code, playerId } = socket.data;
      const room = code && manager.get(code);
      const player = room && room.byId(playerId);
      return room && player ? { room, player } : null;
    };

    // Wrap a handler: resolves the caller, replies via ack, broadcasts on success.
    const handle = (event, fn, { host = false, broadcast = true } = {}) => {
      socket.on(event, (payload, ack) => {
        const reply = typeof ack === 'function' ? ack : () => {};
        try {
          const c = ctx();
          if (!c) return reply({ ok: false, error: 'You are not in a room.' });
          if (host && c.room.hostId !== c.player.id) return reply({ ok: false, error: 'Only the host can do that.' });
          const res = fn(c.room, c.player, payload ?? {}) ?? {};
          if (res.error) return reply({ ok: false, error: res.error });
          if (broadcast) c.room.broadcast();
          reply({ ok: true });
        } catch (e) {
          console.error(`[${event}]`, e);
          reply({ ok: false, error: 'Something went wrong.' });
        }
      });
    };

    const enter = (room, player, ack) => {
      socket.data = { code: room.code, playerId: player.id };
      socket.join(room.code);
      room.attach(player, socket.id);
      ack({ ok: true, code: room.code, playerId: player.id, token: player.token });
      socket.emit('chat:history', room.chatHistoryFor(player.id));
      room.broadcast();
    };

    socket.on('room:create', ({ name } = {}, ack = () => {}) => {
      const room = manager.create();
      const { player, error } = room.addPlayer(name);
      if (error) {
        manager.rooms.delete(room.code);
        room.destroy();
        return ack({ ok: false, error });
      }
      enter(room, player, ack);
    });

    socket.on('room:join', ({ code, name } = {}, ack = () => {}) => {
      const room = manager.get(code);
      if (!room) return ack({ ok: false, error: 'Room not found.' });
      const { player, error } = room.addPlayer(name);
      if (error) return ack({ ok: false, error });
      enter(room, player, ack);
    });

    socket.on('room:rejoin', ({ code, token } = {}, ack = () => {}) => {
      const room = manager.get(code);
      const player = room && room.byToken(token);
      if (!player) return ack({ ok: false, error: 'Session expired.' });
      // Drop any stale socket still bound to this seat.
      if (player.socketId && player.socketId !== socket.id) io.sockets.sockets.get(player.socketId)?.disconnect(true);
      enter(room, player, ack);
    });

    socket.on('room:state', (_p, ack = () => {}) => {
      const c = ctx();
      ack(c ? { ok: true, view: viewFor(c.room, c.player.id) } : { ok: false });
    });

    handle('room:settings', (room, _p, patch) => room.setSettings(patch), { host: true });
    handle('game:start', (room) => room.start(), { host: true });
    handle('game:reset', (room) => room.reset(), { host: true });

    handle('host:kick', (room, _p, { playerId }) => {
      const res = room.kick(playerId);
      if (res.player?.socketId) {
        const s = io.sockets.sockets.get(res.player.socketId);
        s?.emit('room:kicked');
        s?.disconnect(true);
      }
      return res;
    }, { host: true });

    handle('host:mute', (room, _p, { playerId, muted }) => room.setHostMute(playerId, !!muted), { host: true });

    handle('game:act', (room, player, action) => room.act(player.id, action));

    handle('chat:send', (room, player, { text }) => room.sendChat(player.id, text), { broadcast: false });

    // WebRTC signaling relay: only between members of the same room.
    socket.on('rtc:signal', ({ to, data } = {}) => {
      const c = ctx();
      const target = c && c.room.byId(to);
      if (target?.socketId) io.to(target.socketId).emit('rtc:signal', { from: c.player.id, data });
    });

    socket.on('disconnect', () => {
      const c = ctx();
      if (c && c.player.socketId === socket.id) c.room.detach(c.player);
    });
  });

  return manager;
}
