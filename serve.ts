// A tiny static file server for playing the game locally:
// `node serve.ts` serves game/ at http://localhost:8080.
// Node 22 standard library only; development convenience, not the entry.
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('./game', import.meta.url)));
const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const requested = portIndex === -1 ? 8080 : Number(args[portIndex + 1]);
const port = Number.isInteger(requested) && requested > 0 && requested < 65536 ? requested : 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const rel = normalize(decodeURIComponent(url.pathname)).replace(/^[/\\]+/, '');
  const path = join(root, rel === '' ? 'index.html' : rel);
  if (!path.startsWith(root + sep) && path !== root) {
    res.writeHead(403);
    res.end('forbidden');
    return;
  }
  let stat;
  try {
    stat = statSync(path);
  } catch {
    res.writeHead(404);
    res.end('not found');
    return;
  }
  if (!stat.isFile()) {
    res.writeHead(404);
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': MIME[extname(path)] || 'application/octet-stream' });
  createReadStream(path).pipe(res);
});

server.listen(port, () => {
  console.log(`STARFORGE at http://localhost:${port}/`);
});
