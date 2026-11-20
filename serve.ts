// Vice Cover — tiny static server for local development only.
// Serves app/ at http://localhost:8080 with no network request of its own.
// Usage: node serve.ts [port]

import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const root = join(here, 'app');
const port = Number(process.argv[2] || process.env.PORT || 8080);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.json': 'application/json',
};

const server = createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname);
  const target = normalize(join(root, urlPath === '/' ? 'index.html' : urlPath));
  if (!target.startsWith(root) || !existsSync(target) || !statSync(target).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(target)] || 'application/octet-stream' });
  createReadStream(target).pipe(res);
});

server.listen(port, () => {
  console.log(`Vice Cover at http://localhost:${port}`);
});
