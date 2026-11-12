import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('./dist', import.meta.url));
const port = Number(process.env.PORT || 4173);

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

function resolveFile(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split('?')[0] || '/');
  const normalized = normalize(cleanPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = join(root, normalized === '/' ? 'index.html' : normalized);

  if (filePath.startsWith(root) && existsSync(filePath) && statSync(filePath).isFile()) {
    return filePath;
  }

  return join(root, 'index.html');
}

createServer((request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405);
    response.end();
    return;
  }

  const filePath = resolveFile(request.url || '/');
  const extension = extname(filePath);
  const headers = {
    'Content-Type': contentTypes[extension] || 'application/octet-stream'
  };

  if (filePath !== join(root, 'index.html')) {
    headers['Cache-Control'] = 'public, max-age=31536000, immutable';
  } else {
    headers['Cache-Control'] = 'no-cache';
  }

  response.writeHead(200, headers);

  if (request.method === 'HEAD') {
    response.end();
    return;
  }

  createReadStream(filePath).pipe(response);
}).listen(port, '0.0.0.0', () => {
  console.log(`TransferTracker web listening on ${port}`);
});
