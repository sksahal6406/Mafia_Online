import { createServer } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { handleHealth } from '../server/health.js';

let server, base;
const fakeManager = { rooms: new Map([['ABCDE', {}], ['FGHJK', {}]]) };

beforeAll(async () => {
  server = createServer((req, res) => {
    if (handleHealth(req, res, fakeManager)) return;
    res.writeHead(404).end('not health');
  });
  await new Promise((r) => server.listen(0, r));
  base = `http://localhost:${server.address().port}`;
});

afterAll(() => new Promise((r) => server.close(r)));

describe('GET /health', () => {
  it('returns 200 JSON with status, uptime and room count', async () => {
    const res = await fetch(`${base}/health`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/application\/json/);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const body = await res.json();
    expect(body).toMatchObject({ status: 'ok', rooms: 2 });
    expect(body.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it('ignores query strings, supports HEAD, rejects other methods', async () => {
    expect((await fetch(`${base}/health?check=1`)).status).toBe(200);
    const head = await fetch(`${base}/health`, { method: 'HEAD' });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe('');
    const post = await fetch(`${base}/health`, { method: 'POST' });
    expect(post.status).toBe(405);
    expect(post.headers.get('allow')).toBe('GET, HEAD');
  });

  it('does not intercept other paths', async () => {
    const res = await fetch(`${base}/healthz`);
    expect(res.status).toBe(404);
    expect(await res.text()).toBe('not health');
  });

  it('works before the room manager exists', async () => {
    const calls = [];
    const res = { writeHead: (...a) => calls.push(a), end: () => {} };
    expect(handleHealth({ url: '/health', method: 'GET' }, res, undefined)).toBe(true);
    expect(calls[0][0]).toBe(200);
  });
});
