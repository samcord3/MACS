// Service worker — network-first for the app shell so new deploys reach users
// immediately; cache is the offline fallback only.
const CACHE = "ac-v2";
const ASSETS = ["./", "./index.html", "./manifest.json"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  // Never intercept Firebase or analytics calls
  if (url.hostname.includes("firebase") || url.hostname.includes("google")) return;
  if (e.request.method !== "GET") return;

  // NETWORK-FIRST: always try the live version; fall back to cache when offline.
  // Only successful responses are cached so a 404/500 can't overwrite a good copy.
  e.respondWith(
    fetch(e.request).then(resp => {
      if (resp.ok) {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      }
      return resp;
    }).catch(() =>
      caches.match(e.request).then(r => r || caches.match("./index.html"))
    )
  );
});
