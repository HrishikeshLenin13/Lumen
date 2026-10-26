const CACHE_NAME = "lumen-app-68c11875dd";
const APP_SHELL = ["./index.html", "./css/lumen-vintage.css?v=65bcb47fec", "./js/main.js?v=91519c235b", "./css/sprites.css?v=46ec928119", "./icons/favicon.png?v=4ea57d5731", "./icons/app-icon.png?v=9b31fb1c3a", "./icons/app-icon-512.png?v=1ae0dff486", "./js/data-core.mjs?v=93a449cdab", "./js/lumen-script.mjs?v=0db2593a2d", "./js/lumen-screen.mjs?v=f58703268d", "./js/script-editor.mjs?v=8fee3934bd", "./js/script-samples.mjs?v=d8e2e4c382", "./js/rock-lines.mjs?v=e67b37432f", "./manifest.webmanifest?v=b10743e778", "./sounds/open.mp3", "./sounds/close.mp3", "./sounds/minimize.mp3", "./sounds/restore.mp3", "./sounds/thud.mp3", "./sounds/win.mp3", "./sounds/boom.mp3", "./sounds/degauss.mp3", "./sounds/timer.mp3", "./sounds/flip.mp3", "./icons/wallpaper.png?v=5e0b52de42", "./icons/wallpaper-spectrum.jpg"];
let cachePromise = null;
APP_SHELL.push("./js/character-map.mjs?v=569255b407");
APP_SHELL.push("./js/system-files.mjs?v=e9d1407102");

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
