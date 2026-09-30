import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 5173);
const backend = new URL(process.env.BACKEND_URL || 'http://localhost:8080');
const routes = [/^\/api\/transfers$/, /^\/api\/transfers\/team\/\d+$/, /^\/api\/transfer\/posts\/(?:FABRIZIO_ROMANO|DAVID_ORNSTEIN|MATTEO_MORETTO)$/, /^\/api\/transfer\/posts\/team\/\d+$/, /^\/api\/teams$/, /^\/api\/teams\/league$/, /^\/api\/players$/, /^\/api\/team\/\d+$/, /^\/api\/team\/test\/\d+$/, /^\/api\/team\/player\/\d+$/, /^\/api\/player\/\d+$/, /^\/api\/player\/transfer\/\d+$/];
const files = {'/': ['index.html', 'text/html; charset=utf-8'], '/app.js': ['app.js', 'text/javascript; charset=utf-8'], '/style.css': ['style.css', 'text/css; charset=utf-8']};

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method !== 'GET') { res.writeHead(405).end('Method not allowed'); return; }
  if (routes.some(pattern => pattern.test(url.pathname))) {
    try {
      const target = new URL(url.pathname + url.search, backend);
      const response = await fetch(target, { signal: AbortSignal.timeout(8000) });
      res.writeHead(response.status, {'content-type': response.headers.get('content-type') || 'application/json; charset=utf-8', 'cache-control': 'no-store'});
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch {
      res.writeHead(502, {'content-type': 'application/json; charset=utf-8'}).end(JSON.stringify({message: '백엔드에 연결할 수 없습니다. BACKEND_URL과 서버 실행 상태를 확인해 주세요.'}));
    }
    return;
  }
  const file = files[url.pathname];
  if (!file) { res.writeHead(404).end('Not found'); return; }
  try { res.writeHead(200, {'content-type': file[1], 'cache-control': 'no-store'}).end(await readFile(path.join(root, file[0]))); }
  catch { res.writeHead(500).end('File error'); }
}).listen(port, '0.0.0.0', () => console.log(`Transfer Tracker listening on port ${port} → ${backend.origin}`));
