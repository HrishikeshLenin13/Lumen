import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
