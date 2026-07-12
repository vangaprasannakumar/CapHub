// CapHub Service Worker
// IMPORTANT: bump CACHE_NAME on every meaningful release. Service workers only re-install when
// this FILE's bytes change - if CACHE_NAME (or anything else here) doesn't change, browsers won't
// detect an update at all, and returning users can get stuck on an old cached index.html forever.
const CACHE_NAME = 'caphub-v2-2026-07-12';
const CORE_ASSETS = [
    './index.html',
    './manifest.json'
];

// Install: cache the core app shell. Each asset is cached individually (not via addAll) so one
// failure doesn't abort the whole install - defensive, since this is a solo-maintained tool.
// Deliberately does NOT call skipWaiting() here - a new worker sits in the "waiting" state until
// the person confirms the update via the in-app toast (see SKIP_WAITING message below), so an
// update never yanks the page out from under someone mid-calculation.
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.all(
                CORE_ASSETS.map((url) => cache.add(url).catch((err) => {
                    console.warn('SW: failed to cache', url, err);
                }))
            );
        })
    );
});

// The page posts this once the person clicks "Update" on the in-app toast.
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Activate: delete any cache that isn't the current version, then take control of open tabs
// immediately (clients.claim()) so an already-open app gets the update without a second reload.
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => Promise.all(
            cacheNames.map((name) => name !== CACHE_NAME ? caches.delete(name) : null)
        )).then(() => self.clients.claim())
    );
});

// Fetch: stale-while-revalidate. Serve from cache immediately if available (fast, works offline),
// then fetch in the background to refresh the cache for next time. This also opportunistically
// caches cross-origin assets (Google Fonts, the app icon) the first time they're actually loaded,
// without needing to pre-list every font file up front (which can change on Google's end).
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.open(CACHE_NAME).then((cache) =>
            cache.match(event.request).then((cached) => {
                const network = fetch(event.request).then((response) => {
                    if (response && (response.ok || response.type === 'opaque')) {
                        cache.put(event.request, response.clone());
                    }
                    return response;
                }).catch(() => cached); // offline and not cached - nothing more we can do

                return cached || network;
            })
        )
    );
});
