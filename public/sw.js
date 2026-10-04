const CACHE_NAME = 'transfertracker-shell-v3';
const APP_SHELL = ['/manifest.webmanifest', '/icons/transfertracker-icon.svg'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // API는 항상 네트워크에서 최신 데이터를 사용한다.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  // Vite 해시 번들은 브라우저 HTTP 캐시에 맡긴다.
  // Service Worker가 과거 index-*.js를 보관하지 않게 한다.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(fetch(request));
    return;
  }

  // SPA 문서는 network-first. 오프라인 fallback은 "/" HTML을 저장하지 않는다.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request));
    return;
  }

  // 아이콘/manifest 같은 고정 shell만 cache-first.
  if (APP_SHELL.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request))
    );
  }
});
