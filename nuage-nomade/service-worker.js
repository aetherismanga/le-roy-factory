const BUILD = '20261114-visual-coherence-1';
const CACHE_PREFIX = 'nuage-nomade-';
const CACHE_NAME = CACHE_PREFIX + BUILD;
const SCOPE_URL = new URL(self.registration.scope);
const SHELL_URL = new URL('./index.html?v=' + BUILD, SCOPE_URL).href;
const CORE = [
  SHELL_URL,
  './manifest.webmanifest',
  './icon.svg',
  './install.html',
  './hotfix.js?v=' + BUILD,
  ...Array.from({ length: 11 }, (_, index) =>
    './parts/part-' + String(index).padStart(3, '0') + '.txt?v=' + BUILD),
  './assets/level8.webp?v=' + BUILD,
  './assets/vortex.webp?v=' + BUILD,
  './assets/boss_atlas.webp?v=' + BUILD,
].map(path => new URL(path, SCOPE_URL).href);

self.addEventListener('install', event => {
  // Keep the previous working version until the entire new game is available.
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== SCOPE_URL.origin || !url.pathname.startsWith(SCOPE_URL.pathname)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(event.request);
    // Versioned files form one precached release, including all eleven parts.
    if (url.searchParams.get('v') === BUILD && cached) return cached;

    try {
      const response = await fetch(event.request, { cache: 'no-store' });
      if (response.ok) {
        if (event.request.mode !== 'navigate') {
          await cache.put(event.request, response.clone()).catch(() => {});
        }
        return response;
      }
      if (cached) return cached;
      if (event.request.mode === 'navigate') {
        const shell = await cache.match(SHELL_URL);
        if (shell) return shell;
      }
      return response;
    } catch (error) {
      if (cached) return cached;
      if (event.request.mode === 'navigate') {
        const shell = await cache.match(SHELL_URL);
        if (shell) return shell;
      }
      // Missing images/scripts remain failures; never answer with HTML here.
      return Response.error();
    }
  })());
});
