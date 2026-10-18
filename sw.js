const CACHE_NAME = "lumen-app-f06a5dcd31";
const APP_SHELL = ["./", "./index.html", "./css/lumen-vintage.css?v=f0a96ad9ee", "./js/main.js?v=b10c238719", "./js/atlas-map.mjs?v=d1912f48d1", "./icons/atlas.png?v=c90e3db2e5", "./icons/favicon.png?v=6da4b3c16f", "./icons/app-icon.png?v=9e98d8ad02", "./icons/app-icon-512.png?v=0b82f5e871", "./js/data-core.mjs?v=c6f913b5f3", "./js/rock-lines.mjs?v=b747b167bd", "./manifest.webmanifest?v=fad35e93d7", "./sounds/open.mp3", "./sounds/close.mp3", "./sounds/minimize.mp3", "./sounds/restore.mp3", "./sounds/thud.mp3", "./sounds/win.mp3", "./sounds/boom.mp3", "./sounds/degauss.mp3", "./sounds/timer.mp3", "./sounds/flip.mp3", "./icons/wallpaper.png?v=5e0b52de42", "./icons/wallpaper-midnight.png?v=d5a967ff8e", "./icons/wallpaper-aurora.png?v=d5a967ff8e", "./icons/wallpaper-graphite.png?v=d5a967ff8e"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(async (cache) => { for (const url of APP_SHELL) await cache.add(url); }));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((names) => Promise.all(names.filter((name) => name.startsWith("lumen-app-") && name !== CACHE_NAME).map((name) => caches.delete(name)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    if (request.mode !== "navigate" && new URL(request.url).searchParams.has("v")) {
      const cached = await cache.match(request);
      if (cached) return cached;
    }
    try {
      const response = await fetch(new Request(request, { cache: "no-store" }));
      if (response.ok && response.type !== "opaque") {
        event.waitUntil(cache.put(request, response.clone()).catch(() => {}));
      }
      return response;
    } catch {
      const cached = await cache.match(request, { ignoreSearch: true });
      if (cached) return cached;
      if (request.mode === "navigate") {
        const shell = await cache.match("./index.html", { ignoreSearch: true });
        if (shell) return shell;
      }
      return Response.error();
    }
  })());
});
