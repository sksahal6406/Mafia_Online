/**
 * GET /health: lightweight liveness check for hosts like Render, Railway or Fly.
 * Answers before Next.js is involved, and reveals nothing about players or rooms
 * beyond a count. Returns true when it handled the request.
 */
export function handleHealth(req, res, manager) {
  const path = (req.url ?? '').split('?')[0];
  if (path !== '/health') return false;

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    res.end();
    return true;
  }

  const body = JSON.stringify({
    status: 'ok',
    uptimeSeconds: Math.round(process.uptime()),
    rooms: manager ? manager.rooms.size : 0,
  });
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  res.end(req.method === 'HEAD' ? undefined : body);
  return true;
}
