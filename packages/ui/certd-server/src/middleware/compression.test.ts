import assert from "node:assert/strict";
import { shouldCompress } from "./compression.js";

function createContext(overrides: Record<string, unknown> = {}) {
  const headers: Record<string, string> = { "Accept-Encoding": "gzip" };
  return {
    method: "GET",
    status: 200,
    body: { data: "response" },
    request: { get: (name: string) => headers[name] },
    response: { get: (name: string) => headers[name] },
    ...overrides,
  } as any;
}

describe("compression middleware", () => {
  it("compresses gzip-capable API responses", () => {
    assert.equal(shouldCompress(createContext()), true);
  });

  it("skips responses without gzip support or downloads", () => {
    assert.equal(shouldCompress(createContext({ request: { get: () => "br" } })), false);
    assert.equal(shouldCompress(createContext({ response: { get: (name: string) => (name === "Content-Disposition" ? "attachment" : undefined) } })), false);
  });
});
