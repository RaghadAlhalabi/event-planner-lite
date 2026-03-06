const CACHE_VERSION = "v1";
const STATIC_CACHE = `event-planner-static-${CACHE_VERSION}`;
const API_CACHE = `event-planner-api-${CACHE_VERSION}`;
const CACHE_PREFIX = "event-planner-";

const APP_SHELL_URLS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/vite.svg",
];

const STATIC_DESTINATIONS = new Set([
  "document",
  "script",
  "style",
  "image",
  "font",
]);

const STATIC_EXTENSIONS = /\.(?:css|js|mjs|png|jpg|jpeg|gif|svg|webp|ico|woff2?)$/i;

async function precacheDiscoveredAssets(cache) {
  try {
    const response = await fetch("/", { cache: "no-store" });
    if (!response.ok) return;

    const html = await response.text();
    const matches = [
      ...html.matchAll(/(?:src|href)=["']([^"']+)["']/g),
    ]
      .map((match) => match[1])
      .filter((value) => value.startsWith("/assets/") || value.startsWith("/src/"));

    const uniqueAssets = [...new Set(matches)];
    await Promise.all(
      uniqueAssets.map((assetUrl) =>
        fetch(assetUrl)
          .then((assetResponse) => {
            if (canCache(assetResponse)) {
              return cache.put(assetUrl, assetResponse.clone());
            }
            return undefined;
          })
          .catch(() => undefined)
      )
    );
  } catch {
    // Ignore discovery failures and keep install resilient.
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then(async (cache) => {
        await cache.addAll(APP_SHELL_URLS);
        await precacheDiscoveredAssets(cache);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter(
            (key) =>
              key.startsWith(CACHE_PREFIX) &&
              key !== STATIC_CACHE &&
              key !== API_CACHE
          )
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

function canCache(response) {
  return response && (response.ok || response.type === "opaque");
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const networkResponse = await fetch(request);
  if (canCache(networkResponse)) {
    cache.put(request, networkResponse.clone());
  }
  return networkResponse;
}

async function networkFirst(request, cacheName, offlineFallback) {
  const cache = await caches.open(cacheName);

  try {
    const networkResponse = await fetch(request);
    if (canCache(networkResponse)) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return offlineFallback;
  }
}

function isApiGet(request, url) {
  if (request.method !== "GET") return false;
  return url.pathname.startsWith("/api/");
}

function isStaticAssetRequest(request, url) {
  if (request.method !== "GET") return false;
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/assets/")) return true;
  if (url.pathname.startsWith("/icons/")) return true;
  if (STATIC_EXTENSIONS.test(url.pathname)) return true;
  return STATIC_DESTINATIONS.has(request.destination);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (isApiGet(request, url)) {
    event.respondWith(
      networkFirst(
        request,
        API_CACHE,
        new Response(
          JSON.stringify({
            error: "Offline",
            message: "You are offline and no cached API response is available.",
          }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" },
          }
        )
      )
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      networkFirst(
        request,
        STATIC_CACHE,
        new Response("Offline", {
          status: 200,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        })
      )
    );
    return;
  }

  if (isStaticAssetRequest(request, url)) {
    event.respondWith(
      cacheFirst(request, STATIC_CACHE).catch(() =>
        new Response("Offline", {
          status: 200,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        })
      )
    );
    return;
  }

  event.respondWith(
    fetch(request).catch(
      () =>
        new Response("Offline", {
          status: 200,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        })
    )
  );
});
