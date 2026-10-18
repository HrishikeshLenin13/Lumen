const CACHE_NAME = "lumen-app-1ce7d14a75";
const APP_SHELL = ["./index.html", "./css/lumen-vintage.css?v=5ed667c6e5", "./js/main.js?v=a21829569a", "./css/sprites.css?v=2c6fc34343", "./icons/favicon.png?v=04bc934e40", "./icons/app-icon.png?v=0f309a1148", "./icons/app-icon-512.png?v=05ade58a80", "./js/data-core.mjs?v=7759b7477f", "./js/lumen-script.mjs?v=5043e82c5d", "./js/script-samples.mjs?v=379e94c5ad", "./js/rock-lines.mjs?v=b747b167bd", "./manifest.webmanifest?v=1a59361828", "./sounds/open.mp3", "./sounds/close.mp3", "./sounds/minimize.mp3", "./sounds/restore.mp3", "./sounds/thud.mp3", "./sounds/win.mp3", "./sounds/boom.mp3", "./sounds/degauss.mp3", "./sounds/timer.mp3", "./sounds/flip.mp3", "./icons/wallpaper.png?v=5e0b52de42", "./icons/wallpaper-spectrum.jpg"];
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
