// Offline shell for the K♡T page. It answers ONLY for the page's own files listed below;
// everything else (the iPhone apps in ./rider/ and ./captain/, GitHub downloads, the API) goes straight to the network.
const VERSION = "kt-16";
const SHELL = [
  "./", "index.html", "manifest.webmanifest",
  "assets/css/site.css", "assets/js/site.js",
  "assets/vendor/swiper-bundle.min.css", "assets/vendor/swiper-bundle.min.js",
  "assets/img/bg-sunset.webp", "assets/img/rider.webp", "assets/img/captain.webp", "assets/img/cashier.webp", "assets/img/mytouch.webp", "assets/img/rafeeq.webp", "assets/img/rafeeq-voice.webp",
  "assets/icons/icon-192.png", "assets/icons/apple-touch-icon.png", "assets/icons/favicon-48.png",
  "assets/fonts/noto-kufi-arabic-arabic-400-normal.woff2", "assets/fonts/noto-kufi-arabic-arabic-500-normal.woff2",
  "assets/fonts/noto-kufi-arabic-arabic-700-normal.woff2", "assets/fonts/noto-kufi-arabic-arabic-800-normal.woff2",
  "assets/fonts/montserrat-latin-300-normal.woff2", "assets/fonts/montserrat-latin-500-normal.woff2",
  "assets/fonts/montserrat-latin-600-normal.woff2", "assets/fonts/montserrat-latin-700-normal.woff2",
  "assets/media/splash-tone.mp3"
];
const OWN = new Set(SHELL.map(p => new URL(p, self.registration.scope).href));

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url); url.search = "";
  if (!OWN.has(url.href)) return;                       // not ours: untouched
  const isPage = req.mode === "navigate";
  if (isPage) {                                         // the page: fresh first, cached copy when offline
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put("./", copy)); return r; })
      .catch(() => caches.match("./")));
    return;
  }
  e.respondWith(caches.match(url.href).then(hit => {    // files: cached copy now, refreshed in the background
    const net = fetch(req).then(r => { if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(url.href, copy)); } return r; });
    return hit || net;
  }));
});
