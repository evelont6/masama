import { test } from "node:test";
import assert from "node:assert/strict";
import handler from "../api/parse-receipt.js";

test("receipt endpoint rejects unsupported methods and malformed images", async () => {
  const previous = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-only";
  try {
    for (const [req, status] of [[{ method: "GET" }, 405], [{ method: "POST", body: { image: "bad image!" } }, 400]]) {
      const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
      await handler(req, res);
      assert.equal(res.code, status);
    }
  } finally {
    if (previous === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previous;
  }
});
