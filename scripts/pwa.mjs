import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(e => e.isDirectory() ? files(`${dir}/${e.name}`) : `${dir}/${e.name}`))).flat();
}
const paths = (await files("dist")).filter(p => !p.endsWith("sw.js"));
const hash = createHash("sha256");
for (const path of paths) hash.update(await readFile(path));
const cache = `masama-${hash.digest("hex").slice(0, 12)}`;
const base = process.env.VITE_BASE_PATH || "/";
const assets = paths.map(p => base + p.slice(5));
await writeFile("dist/sw.js", `
const CACHE = ${JSON.stringify(cache)};
const ASSETS = ${JSON.stringify(assets)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('masama-') && key !== CACHE).map(key => caches.delete(key)))));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(caches.open(CACHE).then(cache => cache.match(${JSON.stringify(base + 'index.html')})).then(cached => cached || fetch(event.request)));
  } else if (ASSETS.includes(url.pathname)) {
    event.respondWith(caches.open(CACHE).then(cache => cache.match(url.pathname)).then(cached => cached || fetch(event.request)));
  }
});
`);
console.log(`PWA shell: ${assets.length} assets, ${cache}`);
