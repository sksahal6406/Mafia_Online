import { createServer } from 'node:http';
import { io as connect } from 'socket.io-client';
import { Server } from 'socket.io';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { attachSocket } from '../server/socket/index.js';

let httpServer, ioServer, manager, port;

beforeAll(async () => {
  httpServer = createServer();
  ioServer = new Server(httpServer);
  manager = attachSocket(ioServer, { timeScale: 0.01 });
  await new Promise((r) => httpServer.listen(0, r));
  port = httpServer.address().port;
});

afterAll(async () => {
  manager.close();
  ioServer.close();
  await new Promise((r) => httpServer.close(r));
});

function client() {
  const socket = connect(`http://localhost:${port}`, { forceNew: true });
  const c = { socket, view: null, chat: [], playerId: null, token: null };
  socket.on('state:update', (v) => (c.view = v));
  socket.on('chat:message', (m) => c.chat.push(m));
  c.emit = (ev, payload) => new Promise((res) => socket.emit(ev, payload, res));
  return c;
}

const waitFor = async (fn, ms = 20000) => {
  const t = Date.now();
  while (Date.now() - t < ms) {
    if (fn()) return;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error('waitFor timed out');
};

async function lobby(n) {
  const clients = Array.from({ length: n }, client);
  const host = clients[0];
  let res = await host.emit('room:create', { name: 'Host' });
  expect(res.ok).toBe(true);
  host.playerId = res.playerId;
  host.token = res.token;
  const code = res.code;
  for (let i = 1; i < n; i++) {
    res = await clients[i].emit('room:join', { code, name: `P${i}` });
    expect(res.ok).toBe(true);
    clients[i].playerId = res.playerId;
    clients[i].token = res.token;
  }
  await waitFor(() => host.view?.players.length === n);
  return { clients, host, code };
}

describe('lobby', () => {
  it('rejects duplicate names, unknown rooms, non-host actions', async () => {
    const { clients, code } = await lobby(6);
    const dup = client();
    expect((await dup.emit('room:join', { code, name: 'host' })).ok).toBe(false);
    expect((await dup.emit('room:join', { code: 'ZZZZZ', name: 'X' })).ok).toBe(false);
    expect((await clients[1].emit('game:start', {})).ok).toBe(false);
    expect((await clients[1].emit('room:settings', { mafia: 1 })).ok).toBe(false);
    [dup, ...clients].forEach((c) => c.socket.close());
  });

  it('caps at 12 players and blocks start below 6', async () => {
    const { clients, host, code } = await lobby(5);
    const res = await host.emit('game:start', {});
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/6-12/);
    const extra = Array.from({ length: 8 }, client);
    const results = [];
    for (let i = 0; i < 8; i++) results.push(await extra[i].emit('room:join', { code, name: `E${i}` }));
    expect(results.filter((r) => r.ok)).toHaveLength(7);
    [...clients, ...extra].forEach((c) => c.socket.close());
  });

  it('host can change role counts', async () => {
    const { clients, host } = await lobby(8);
    expect((await host.emit('room:settings', { mafia: 3, doctor: 0 })).ok).toBe(true);
    await waitFor(() => host.view.settings.mafia === 3);
    expect((await host.emit('room:settings', { mafia: 9 })).ok).toBe(false);
    clients.forEach((c) => c.socket.close());
  });
});

describe('secrecy', () => {
  it('never leaks roles or night actions to the wrong players', async () => {
    const { clients, host } = await lobby(8);
    await host.emit('room:settings', { timers: { night: 120 } });
    expect((await host.emit('game:start', {})).ok).toBe(true);
    await waitFor(() => clients.every((c) => c.view?.you));

    // Role reveal phase: everybody sees only their own role (and teammates for mafia).
    for (const c of clients) {
      const known = c.view.players.filter((p) => p.role);
      if (c.view.you.role === 'mafia') expect(known).toHaveLength(2);
      else expect(known.map((p) => p.id)).toEqual([c.playerId]);
    }

    await waitFor(() => host.view.phase === 'night_mafia');
    const mafia = clients.filter((c) => c.view.you.role === 'mafia');
    const town = clients.filter((c) => c.view.you.role !== 'mafia');
    const victim = town[0];
    await mafia[0].emit('game:act', { type: 'mafia_vote', target: victim.playerId });
    await waitFor(() => mafia[1].view.private.mafiaVotes?.[mafia[0].playerId]);
    for (const c of town) {
      expect(c.view.private.mafiaVotes).toBeUndefined();
      expect(JSON.stringify(c.view)).not.toContain(mafia[0].playerId + '"' + ':"mafia"');
    }

    // Media policy: only mafia talk at night.
    expect(mafia[0].view.media.sendTo).toEqual([mafia[1].playerId]);
    expect(town[1].view.media.sendTo).toEqual([]);
    expect(town[1].view.media.receiveFrom).toEqual([]);

    // Chat channels: mafia chat is private, town cannot chat at night.
    await mafia[0].emit('chat:send', { text: 'kill them' });
    expect((await town[1].emit('chat:send', { text: 'hi' })).ok).toBe(false);
    await waitFor(() => mafia[1].chat.length === 1);
    expect(town.every((c) => c.chat.length === 0)).toBe(true);
    clients.forEach((c) => c.socket.close());
  });
});

describe('reconnect', () => {
  it('restores a seat with the token', async () => {
    const { clients, host, code } = await lobby(6);
    const p = clients[2];
    p.socket.close();
    await waitFor(() => host.view.players.find((x) => x.id === p.playerId)?.connected === false);
    const back = client();
    const res = await back.emit('room:rejoin', { code, token: p.token });
    expect(res.ok).toBe(true);
    expect(res.playerId).toBe(p.playerId);
    await waitFor(() => back.view?.youId === p.playerId);
    expect((await client().emit('room:rejoin', { code, token: 'bad' })).ok).toBe(false);
    [...clients, back].forEach((c) => c.socket.close());
  });
});

describe('full game', () => {
  it('plays to completion with bots and reveals everything at the end', async () => {
    const { clients, host } = await lobby(8);
    await host.emit('game:start', {});

    const play = (c) => {
      const v = c.view;
      if (!v?.you?.alive) return;
      const others = v.players.filter((p) => p.alive && p.id !== c.playerId);
      const nonMafia = others.filter((p) => p.role !== 'mafia');
      const act = (type, target) => c.socket.emit('game:act', { type, target });
      if (v.phase === 'night_mafia' && v.you.role === 'mafia') act('mafia_vote', nonMafia[0].id);
      else if (v.phase === 'night_doctor' && v.you.role === 'doctor') act('protect', c.playerId);
      else if (v.phase === 'night_detective' && v.you.role === 'detective') act('investigate', others[0].id);
      else if (v.phase === 'day_vote' || v.phase === 'day_revote') {
        const choices = v.phase === 'day_revote' ? others.filter((p) => v.day.tied.includes(p.id)) : others;
        act('vote', choices[0]?.id ?? null);
      }
    };
    clients.forEach((c) => c.socket.on('state:update', () => play(c)));

    await waitFor(() => host.view.phase === 'game_over', 40000);
    expect(['mafia', 'town']).toContain(host.view.winner);
    expect(Object.keys(host.view.private.roles)).toHaveLength(8);
    expect(host.view.players.every((p) => p.role)).toBe(true);
    expect((await host.emit('game:reset', {})).ok).toBe(true);
    await waitFor(() => host.view.phase === 'lobby');
    clients.forEach((c) => c.socket.close());
  }, 60000);
});

describe('video setting', () => {
  it('host can disable video and the media policy reflects it', async () => {
    const { clients, host } = await lobby(6);
    expect(host.view.settings.video).toBe(true);
    expect((await host.emit('room:settings', { video: false })).ok).toBe(true);
    await waitFor(() => clients.every((c) => c.view.media.video === false && c.view.settings.video === false));
    expect((await clients[1].emit('room:settings', { video: true })).ok).toBe(false);
    clients.forEach((c) => c.socket.close());
  });
});
