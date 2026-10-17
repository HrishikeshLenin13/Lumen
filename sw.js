const CACHE_NAME = "lumen-app-f6b05b1964";
const APP_SHELL = ["./", "./index.html", "./css/lumen-vintage.css?v=0d158112f0", "./js/main.js?v=ca8e0e3f3b", "./js/data-core.mjs?v=17d0f9db98", "./manifest.webmanifest?v=b3be82fbe2", "./icons/l.png?v=33d4468d61", "./icons/favicon.png?v=86272e4942", "./icons/app-icon.png?v=e4a80b6eb1", "./icons/notes.png?v=8c65e95fff", "./icons/timer.png?v=13bd7c6582", "./icons/logs.png?v=7ce34f25cf", "./icons/checklist.png?v=0e27a20bbd", "./icons/calculator.png?v=528346ef06", "./icons/pet-rock.png?v=65c80a1be7", "./icons/pet-rock-art.png?v=e8e02ecb64", "./icons/fortune.png?v=65c80a1be7", "./icons/coin.png?v=65c80a1be7", "./icons/busy.png?v=65c80a1be7", "./icons/user-placeholder.png?v=3a2cefad8c", "./icons/about-art.png?v=d39928dde5", "./icons/help.png?v=aa753d325e", "./icons/info.png?v=b8b38795ff", "./icons/cursor.png?v=af1b0be3b4", "./icons/wallpaper.png?v=01c59e11e7", "./icons/wallpaper-midnight.png?v=d5a967ff8e", "./icons/wallpaper-aurora.png?v=d5a967ff8e", "./icons/wallpaper-graphite.png?v=d5a967ff8e"];

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
