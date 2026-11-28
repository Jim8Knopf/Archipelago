// ============================================================
// Service worker: makes the installed app open without a network.
//
// Network-first, always. Every request goes to the network, and the cache
// is only the fallback when the network fails or is too slow. So online,
// players and the GM always run the latest deploy (no "hard refresh"
// needed, which an installed app can't do anyway). Offline, they get the
// last version they loaded.
//
// Only page files are handled here: this site, the Firebase SDK scripts on
// gstatic and Google Fonts. Firestore's own traffic is left alone; its
// offline data comes from the SDK's IndexedDB cache (js/firebase-init.js).
// ============================================================

const CACHE = "archipelago-v3";

// Pages to keep available offline even if they were never opened online.
const PRECACHE = [
  "./",
  "css/style.css",
  "js/confirm.js",
  "js/defaults.js",
  "js/dialogs.js",
  "js/firebase-config.js",
  "js/firebase-init.js",
  "js/format.js",
  "js/hold-ui.js",
  "js/nav.js",
  "js/normalize.js",
  "js/portrait-image.js",
  "js/pwa.js",
  "js/rest.js",
  "js/rules-calc.js",
  "js/sheet-layout.js",
  "js/ship.js",
  "js/ship-calc.js",
  "js/ship-cards.js",
  "js/ship-catalog.js",
  "js/sync-status.js",
  "sheet/",
  "sheet/sheet.js",
  "gm/",
  "gm/gm.js",
  "gm/gm-ship.js",
  "rules/",
  "rules/rules.js",
  "rules/rules.css",
  "rules/rules.md",
  "rules/ships.md",
  "rules/ships/index.json",
  "icons/icon-192.png"
];

// After this long without an answer, fall back to the cache if it has one
// (weak table Wi-Fi often hangs rather than failing).
const NETWORK_TIMEOUT_MS = 4000;

const CACHED_HOSTS = new Set([
  "www.gstatic.com",
  "fonts.googleapis.com",
  "fonts.gstatic.com"
]);

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // One missing file must not stop the worker from installing.
    await Promise.all(PRECACHE.map(path => cache.add(path).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

function shouldHandle(request) {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  return url.origin === self.location.origin || CACHED_HOSTS.has(url.hostname);
}

async function fromCache(request) {
  const cache = await caches.open(CACHE);
  // A sheet link carries ?campaign=…&char=…; any cached copy of the page
  // works, since the character comes from Firestore, not from the HTML.
  return (await cache.match(request)) || (await cache.match(request, { ignoreSearch: true }));
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  const network = fetch(request).then(response => {
    // Opaque responses (cross-origin fonts) have status 0 but are usable.
    if (response.ok || response.type === "opaque") {
      cache.put(request, response.clone());
    }
    return response;
  });

  const timeout = new Promise(resolve => setTimeout(resolve, NETWORK_TIMEOUT_MS));
  const fast = await Promise.race([network.catch(() => null), timeout]);
  if (fast) return fast;

  // Network failed or is slow: use the cache, or keep waiting for the
  // network if nothing is cached.
  const cached = await fromCache(request);
  if (cached) return cached;
  return network;
}

self.addEventListener("fetch", (event) => {
  if (!shouldHandle(event.request)) return;
  event.respondWith(networkFirst(event.request));
});
