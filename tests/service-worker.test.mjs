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
    URL, Request: class { constructor(request) { Object.assign(this, request); } }, Response };
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
  assert.match(source, /\.\/icons\/checklist\.png\?v=\w+/);
  assert.match(source, /\.\/icons\/calculator\.png\?v=\w+/);
  assert.match(source, /\.\/icons\/pet-rock\.png\?v=\w+/);
  assert.match(source, /lumen-app-\w{10}/);
  assert.match(html, /<script type="module" src="js\/main\.js\?v=\w+"><\/script>/);
  assert.match(source, /lumen-vintage\.css\?v=\w+/);
});
test('cache stamps match the current file contents', () => assert.equal(spawnSync(process.execPath, ['scripts/stamp-cache.mjs', '--check'], { cwd: new URL('..', import.meta.url) }).status, 0));
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
