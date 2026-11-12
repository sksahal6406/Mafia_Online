import { randomInt } from 'node:crypto';
import { Room } from './room.js';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L
const ROOM_TTL_MS = 10 * 60_000; // empty rooms live this long

export class RoomManager {
  constructor(io, opts = {}) {
    this.io = io;
    this.opts = opts;
    this.rooms = new Map();
    this.sweeper = setInterval(() => this.sweep(), 60_000);
    this.sweeper.unref?.();
  }

  generateCode() {
    for (;;) {
      let code = '';
      for (let i = 0; i < 5; i++) code += ALPHABET[randomInt(ALPHABET.length)];
      if (!this.rooms.has(code)) return code;
    }
  }

  create() {
    const room = new Room(this.io, this.generateCode(), this.opts);
    this.rooms.set(room.code, room);
    return room;
  }

  get(code) {
    return this.rooms.get(String(code ?? '').toUpperCase().trim());
  }

  sweep() {
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      if (room.isEmpty() && now - room.lastActive > ROOM_TTL_MS * (this.opts.timeScale ?? 1)) {
        room.destroy();
        this.rooms.delete(code);
      }
    }
  }

  close() {
    clearInterval(this.sweeper);
    for (const room of this.rooms.values()) room.destroy();
    this.rooms.clear();
  }
}
