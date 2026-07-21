// Bump this on every deploy that changes any cached file, so returning
// players get the update instead of a stale cached copy forever.
const CACHE_NAME = "wander-cache-v1";

// Only what's actually needed to load and play the game offline.
// nav.html is included because app.js fetches it at runtime to build
// the site nav — without it cached, the nav silently fails to render
// offline (the game itself still works, but it's an easy miss to leave out).
const PRECACHE_URLS = [
  "game.html",
  "style.css",
  "config.js",
  "app.js",
  "game.js",
  "walter.js",
  "nav.html",
  "manifest.webmanifest",
  "icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Save/load and leaderboard calls go to Google Apps Script — these
  // must always hit the real network. Saves are allowed to require an
  // internet connection; caching or faking these responses would be
  // actively wrong, not just unhelpful.
  if (url.hostname === "script.google.com") return; // let the browser handle it normally, uncached

  // Only handle GET requests for same-origin static assets — anything
  // else (cross-origin, non-GET) is left to the network as normal.
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response && response.ok){
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached); // offline and not cached — nothing more to do
      // Cache-first when available (instant, works offline), but still
      // refresh the cache in the background so the next load picks up
      // any update rather than being stuck on the first version forever.
      return cached || network;
    })
  );
});
