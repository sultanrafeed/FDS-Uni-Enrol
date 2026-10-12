// Offline support: cache the app shell so it works on the train with no signal.
const CACHE = "uec-v1";
const FILES = ["./", "index.html", "styles.css", "manifest.webmanifest", "js/repo-data.js", "js/knowledge.js", "js/content.js", "js/simulator.js", "js/app.js", "js/practice.js", "icons/icon-180.png", "icons/icon-192.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return; // never cache GitHub / API calls
  // network first, so updates arrive; fall back to cache offline
  e.respondWith(fetch(e.request).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request)));
});
