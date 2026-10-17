const CACHE_NAME = "lumen-app-v24";
const APP_SHELL = ["./", "./index.html", "./css/lumen-vintage.css?v=21", "./js/main.js?v=23", "./js/data-core.mjs", "./manifest.webmanifest?v=14", "./icons/l.png?v=12", "./icons/favicon.png?v=12", "./icons/app-icon.png?v=12", "./icons/notes.png?v=12", "./icons/timer.png?v=12", "./icons/logs.png?v=12", "./icons/help.png?v=12", "./icons/info.png?v=12", "./icons/cursor.png?v=12", "./icons/wallpaper.png?v=12"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
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
