import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';

async function offline(url, mode) {
  const listeners = {};
  const shell = new Response('<html>Lumen</html>');
  const cache = { match: async request => request === './index.html' ? shell : undefined };
  const context = { self:{ location:new URL('https://lumen.test/'), addEventListener:(name, fn)=>listeners[name]=fn },
    caches:{open:async()=>cache, match:cache.match}, fetch:async()=>{throw new Error('offline');},
    URL, Request: class { constructor(request) { Object.assign(this, request); } }, Response, setTimeout };
  vm.runInNewContext(readFileSync(new URL('../sw.js', import.meta.url), 'utf8'), context);
  let promise;
  listeners.fetch({request:{url, mode, method:'GET'}, respondWith:p=>{promise=p;}, waitUntil() {}});
  return promise ? await promise : undefined;
}

test('offline navigation falls back to the app shell', async () => {
  assert.match(await (await offline('https://lumen.test/missing','navigate')).text(), /Lumen/);
});
test('missing offline scripts never receive HTML', async () => {
  const response = await offline('https://lumen.test/missing.js','cors');
  assert.equal(response.type, 'error');
});
test('cross-origin requests are left to the browser', async () => {
  assert.equal(await offline('https://other.test/api','cors'), undefined);
});

test('the app shell caches current scripts, styles, and app icons', () => {
  const source = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(source, /\.\/js\/data-core\.mjs/);
  assert.match(source, /\.\/js\/lumen-script\.mjs/);
  assert.ok(source.includes("./icons/wallpaper-spectrum.jpg"), "spectrum background stays available offline");
  assert.equal(readFileSync(new URL("../icons/wallpaper-spectrum.jpg", import.meta.url)).subarray(0, 2).toString("hex"), "ffd8", "spectrum background asset is a readable JPEG");
  for (const file of ["css/sprites.css", "icons/favicon.png", "icons/app-icon.png", "icons/app-icon-512.png"]) assert.ok(source.includes("./" + file + "?v="), file);
  assert.doesNotMatch(source, /\.\/icons\/(?!atlas|favicon|app-icon|wallpaper)[a-z-]+\.png/);
  assert.match(source, /lumen-app-\w{10}/);
  assert.match(html, /<script type="module" src="js\/main\.js\?v=\w+"><\/script>/);
  assert.match(source, /lumen-vintage\.css\?v=\w+/);
});
test('cache stamps match the current file contents', () => assert.equal(spawnSync(process.execPath, ['scripts/stamp-cache.mjs', '--check'], { cwd: new URL('..', import.meta.url) }).status, 0));
test('the interface owns its cursor and dialogs', () => { const main = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8'); const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8'); const css = readFileSync(new URL('../css/lumen-vintage.css', import.meta.url), 'utf8'); assert.doesNotMatch(main, /window\.(?:prompt|confirm|alert)/); assert.match(html, /data-screen-cursor/); assert.match(css, /width: 16px; height: 16px/); assert.match(css, /data-wallpaper="spectrum"/); for (const cursor of ["system", "crosshair", "pointer", "wait", "text"]) assert.ok(css.includes(`html[data-cursor="${cursor}"]`), `${cursor} cursor style`); assert.match(main, /cursorFrame = requestAnimationFrame/); });
test('content-hashed assets are served from cache without the network', async () => {
  const listeners = {};
  let fetched = 0;
  const cache = { match: async () => new Response('cached'), put: async () => {} };
  const context = { self: { location: new URL('https://lumen.test/'), addEventListener: (name, fn) => listeners[name] = fn }, caches: { open: async () => cache }, fetch: async () => { fetched += 1; return new Response('fresh'); }, URL, Request: class { constructor(request) { Object.assign(this, request); } }, Response };
  vm.runInNewContext(readFileSync(new URL('../sw.js', import.meta.url), 'utf8'), context);
  let promise;
  listeners.fetch({ request: { url: 'https://lumen.test/css/lumen-vintage.css?v=abc', mode: 'cors', method: 'GET' }, respondWith: (p) => { promise = p; }, waitUntil() {} });
  assert.equal(await (await promise).text(), 'cached');
  assert.equal(fetched, 0);
});
test('the main script parses as a module', () => assert.equal(spawnSync(process.execPath, ['--input-type=module', '--check'], { input: readFileSync(new URL('../js/main.js', import.meta.url)) }).status, 0));

test('the icon atlas is built from art and holds every sprite the app uses', async () => { assert.equal(spawnSync(process.execPath, ['scripts/build-atlas.mjs', '--check'], { cwd: new URL('..', import.meta.url) }).status, 0); const atlasMap = Object.fromEntries([...readFileSync(new URL('../css/sprites.css', import.meta.url), 'utf8').matchAll(/--icon-([a-z0-9-]+): url\("data:image\/png;base64,/g)].map((match) => [match[1], true])); const main = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8'); const css = readFileSync(new URL('../css/lumen-vintage.css', import.meta.url), 'utf8'); const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8'); const used = [...main.matchAll(/sprite\("([a-z0-9-]+)"\)/g), ...css.matchAll(/var\(--icon-([a-z0-9-]+)\)/g), ...html.matchAll(/data-icon="([a-z0-9-]+)"/g)].map((match) => match[1]); assert.ok(used.length > 30 && Object.keys(atlasMap).length > 40); for (const name of used) assert.ok(atlasMap[name], name); assert.doesNotMatch(main + css + html, /icons\/(?!atlas|favicon|app-icon|wallpaper)[a-z0-9-]+\.png/); });
test('a stalled network still opens the cached app', async () => { const listeners = {}; const shell = new Response('<html>Lumen</html>'); const cache = { match: async (request) => request === './index.html' ? shell : undefined, put: async () => {} }; const context = { self: { location: new URL('https://lumen.test/'), addEventListener: (name, fn) => listeners[name] = fn }, caches: { open: async () => cache }, fetch: () => new Promise(() => {}), URL, Request: class { constructor(request) { Object.assign(this, request); } }, Response, setTimeout: (fn) => fn() }; vm.runInNewContext(readFileSync(new URL('../sw.js', import.meta.url), 'utf8'), context); let promise; listeners.fetch({ request: { url: 'https://lumen.test/', mode: 'navigate', method: 'GET' }, respondWith: (p) => { promise = p; }, waitUntil() {} }); assert.match(await (await promise).text(), /Lumen/); });
