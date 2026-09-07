import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile, access } from "node:fs/promises";

test("production worker precaches real assets, serves offline navigation, and excludes API", async () => {
  const source = await readFile("dist/sw.js", "utf8");
  const handlers = {};
  const entries = new Map();
  const cache = { async addAll(paths) { for (const path of paths) { await access(`dist${path}`); entries.set(path, `cached:${path}`); } }, async match(path) { return entries.get(path); } };
  vm.runInNewContext(source, {
    URL,
    self: { location: { origin: "https://masama.test" }, addEventListener: (type, fn) => { handlers[type] = fn; } },
    caches: { open: async () => cache },
    fetch: () => { throw new Error("offline"); },
  });
  let install;
  handlers.install({ waitUntil: promise => { install = promise; } });
  await install;
  let response;
  handlers.fetch({ request: { url: "https://masama.test/", method: "GET", mode: "navigate" }, respondWith: promise => { response = promise; } });
  assert.equal(await response, "cached:/index.html");
  for (const method of ["GET", "POST"]) {
    handlers.fetch({ request: { url: "https://masama.test/api/parse-receipt", method }, respondWith: () => assert.fail("API must not be cached") });
  }
});
