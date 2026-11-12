import { createServer } from 'node:http';
import next from 'next';
import { Server } from 'socket.io';
import { attachSocket } from './server/socket/index.js';

const dev = !process.argv.includes('--prod');
const port = Number(process.env.PORT) || 3000;

const app = next({ dev, port });
await app.prepare();
const handle = app.getRequestHandler();

const httpServer = createServer((req, res) => handle(req, res));
const io = new Server(httpServer, { path: '/socket.io' });
attachSocket(io);

httpServer.listen(port, () => {
  console.log(`> Mafia Overseas ready on http://localhost:${port} (${dev ? 'dev' : 'prod'})`);
});
