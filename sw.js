const CACHE_NAME = "lumen-app-v3";
const APP_SHELL = ["./", "./index.html", "./css/lumen.css", "./js/main.js", "./manifest.webmanifest", "./icons/lumen.svg", "./icons/notes.png", "./icons/timer.png", "./icons/logs.png", "./icons/help.png", "./icons/info.png", "./icons/minimize.png", "./icons/up.png", "./icons/down.png", "./icons/x.png", "./icons/circle.png", "./icons/cursor.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((names) => Promise.all(names.filter((name) => name.startsWith("lumen-app-") && name !== CACHE_NAME).map((name) => caches.delete(name)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match("./index.html")));
    return;
  }
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    if (response.ok || response.type === "opaque") {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
    }
    return response;
  })));
});
