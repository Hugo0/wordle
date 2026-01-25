const CACHE_NAME = 'wordle-v7';
// Only cache essential static assets - Vite-built JS/CSS are cached dynamically on first load
const STATIC_ASSETS = [
    '/static/favicon/favicon.ico',
    '/static/favicon/apple-touch-icon.png',
    '/static/offline.html',
    '/static/offline-game.html'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    // Activate immediately - don't wait for old SW to stop
    self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    // Take control of all pages immediately
    self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip cross-origin requests (CDNs, analytics, etc.)
    if (!event.request.url.startsWith(self.location.origin)) return;

    const url = new URL(event.request.url);

    // Don't cache HTML pages - they contain the daily word which changes
    // Only cache static assets
    if (event.request.mode === 'navigate' || url.pathname === '/' || !url.pathname.startsWith('/static/')) {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    // Network failed on navigation
                    if (event.request.mode === 'navigate') {
                        // Extract language code from path (e.g., /en, /fi, /de)
                        const langMatch = url.pathname.match(/^\/([a-z]{2,3})(?:\/|$)/i);
                        const lang = langMatch ? langMatch[1].toLowerCase() : null;

                        if (lang) {
                            // Serve offline game - game.js will read lang from the original URL path
                            // The browser preserves the original URL, so game.js can extract it
                            return caches.match('/static/offline-game.html').then((response) => {
                                return response || caches.match('/static/offline.html');
                            });
                        }
                        // No language in URL - show language picker
                        return caches.match('/static/offline.html');
                    }
                    return new Response('Offline', { status: 503 });
                })
        );
        return;
    }

    // For static assets: network first, cache fallback
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Only cache successful responses
                if (response.ok) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME)
                        .then((cache) => cache.put(event.request, responseClone))
                        .catch(() => {}); // Ignore cache write failures
                }
                return response;
            })
            .catch(() => {
                // Network failed, try cache
                return caches.match(event.request);
            })
    );
});

// Listen for manual cache clear message from page
self.addEventListener('message', (event) => {
    if (event.data === 'CLEAR_CACHE') {
        caches.keys().then((names) => {
            Promise.all(names.map((name) => caches.delete(name)))
                .then(() => {
                    // Notify all clients that cache was cleared
                    self.clients.matchAll().then((clients) => {
                        clients.forEach((client) => client.postMessage('CACHE_CLEARED'));
                    });
                });
        });
    }

    if (event.data === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
