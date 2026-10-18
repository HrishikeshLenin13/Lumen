const CACHE_NAME = "lumen-app-f0d132b168";
const APP_SHELL = ["./index.html", "./css/lumen-vintage.css?v=9d97ac09e4", "./js/main.js?v=46d7dfd087", "./css/sprites.css?v=2c6fc34343", "./icons/favicon.png?v=04bc934e40", "./icons/app-icon.png?v=0f309a1148", "./icons/app-icon-512.png?v=05ade58a80", "./js/data-core.mjs?v=7f33c67d33", "./js/lumen-script.mjs?v=c3cc0befc4", "./js/rock-lines.mjs?v=b747b167bd", "./manifest.webmanifest?v=1a59361828", "./sounds/open.mp3", "./sounds/close.mp3", "./sounds/minimize.mp3", "./sounds/restore.mp3", "./sounds/thud.mp3", "./sounds/win.mp3", "./sounds/boom.mp3", "./sounds/degauss.mp3", "./sounds/timer.mp3", "./sounds/flip.mp3", "./icons/wallpaper.png?v=5e0b52de42"];
let cachePromise = null;

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
    const cache = await (cachePromise ||= caches.open(CACHE_NAME));
    if (request.mode !== "navigate" && new URL(request.url).searchParams.has("v")) {
      const cached = await cache.match(request);
      if (cached) return cached;
    }
    const network = fetch(new Request(request, { cache: "no-store" })).then((response) => { if (response.ok && response.type !== "opaque") event.waitUntil(cache.put(request, response.clone()).catch(() => {})); return response; });
    const shell = request.mode === "navigate" ? await cache.match("./index.html", { ignoreSearch: true }) : null;
    try {
      if (!shell) return await network;
      const first = await Promise.race([network, new Promise((resolve) => setTimeout(resolve, 3000))]);
      if (first) return first;
      event.waitUntil(network.catch(() => {}));
      return shell;
    } catch {
      const cached = await cache.match(request, { ignoreSearch: true });
      return cached || shell || Response.error();
    }
  })());
});
