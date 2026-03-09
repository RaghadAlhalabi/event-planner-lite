const CACHE_VERSION = "v2";
const STATIC_CACHE = `event-planner-static-${CACHE_VERSION}`;
const API_CACHE = `event-planner-api-${CACHE_VERSION}`;
const IMAGE_CACHE = `event-planner-images-${CACHE_VERSION}`;
const CACHE_PREFIX = "event-planner-";
const OFFLINE_PAGE_URL = "/offline.html";

const APP_SHELL_URLS = [
  "/",
  "/index.html",
  OFFLINE_PAGE_URL,
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

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
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

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((networkResponse) => {
      if (canCache(networkResponse)) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => null);

  if (cached) {
    return cached;
  }

  const networkResponse = await networkPromise;
  if (networkResponse) return networkResponse;

  return new Response("Offline", {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

async function navigateWithOfflineFallback(request) {
  const cache = await caches.open(STATIC_CACHE);

  try {
    const networkResponse = await fetch(request);
    if (canCache(networkResponse)) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cachedPage = await cache.match(request);
    if (cachedPage) return cachedPage;

    const appShell = await cache.match("/") || await cache.match("/index.html");
    if (appShell) return appShell;

    const offlinePage = await cache.match(OFFLINE_PAGE_URL);
    if (offlinePage) return offlinePage;

    return new Response("Offline", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
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
    event.respondWith(navigateWithOfflineFallback(request));
    return;
  }

  if (isStaticAssetRequest(request, url)) {
    if (request.destination === "image") {
      event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
      return;
    }

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
