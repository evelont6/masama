import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";

test("install manifest references real PNG icons", async () => {
  const manifest = JSON.parse(await readFile("public/manifest.webmanifest", "utf8"));
  assert.equal(manifest.display, "standalone");
  for (const icon of manifest.icons) {
    const data = await readFile(`public/${icon.src}`);
    const size = Number(icon.sizes.split("x")[0]);
    assert.equal(data.readUInt32BE(16), size);
    assert.equal(data.readUInt32BE(20), size);
  }
  const html = await readFile("index.html", "utf8");
  const appleIcon = html.match(/rel="apple-touch-icon"[^>]*href="%BASE_URL%([^"]+)"/);
  assert.ok(appleIcon, "HTML must reference an Apple touch icon");
  await access(`public/${appleIcon[1]}`);
});
