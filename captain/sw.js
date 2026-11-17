// Minimal service worker: makes the page installable as an app. It caches nothing, so the app always shows live data.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
