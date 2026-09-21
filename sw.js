const CACHE_NAME = "lumen-app-v8";
const APP_SHELL = ["./", "./index.html", "./css/lumen.css?v=8", "./js/main.js?v=8", "./manifest.webmanifest?v=8", "./icons/lumen.svg?v=8", "./icons/notes.png?v=8", "./icons/timer.png?v=8", "./icons/logs.png?v=8", "./icons/help.png?v=8", "./icons/info.png?v=8", "./icons/circle.png?v=8", "./icons/cursor.png?v=8"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((names) => Promise.all(names.filter((name) => name.startsWith("lumen-app-") && name !== CACHE_NAME).map((name) => caches.delete(name)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(new Request(event.request, { cache: "no-store" })).then((response) => {
    if (response.ok || response.type === "opaque") {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)));
    }
    return response;
  }).catch(() => caches.match(event.request, { ignoreSearch: true }).then((cached) => cached || caches.match("./index.html", { ignoreSearch: true }))));
});
