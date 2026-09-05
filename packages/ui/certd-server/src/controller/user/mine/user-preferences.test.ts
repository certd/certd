/// <reference types="mocha" />
/// <reference types="node" />

import assert from "node:assert/strict";

import { parseUserPreferencesPayload } from "./user-preferences.js";

describe("parseUserPreferencesPayload", () => {
  it("parses wrapped preferences payload", () => {
    const result = parseUserPreferencesPayload({
      preferences: {
        theme: { mode: "dark" },
      },
    });
    assert.deepEqual(result, { theme: { mode: "dark" } });
  });

  it("parses direct preferences payload", () => {
    const result = parseUserPreferencesPayload({
      app: { locale: "en-US" },
      theme: { mode: "light" },
    });
    assert.deepEqual(result, {
      app: { locale: "en-US" },
      theme: { mode: "light" },
    });
  });

  it("parses empty preferences as reset payload", () => {
    assert.deepEqual(parseUserPreferencesPayload({}), {});
    assert.deepEqual(parseUserPreferencesPayload({ preferences: {} }), {});
  });

  it("returns null for invalid payload", () => {
    assert.equal(parseUserPreferencesPayload(null), null);
    assert.equal(parseUserPreferencesPayload([]), null);
    assert.equal(parseUserPreferencesPayload({ foo: 1 }), null);
    assert.equal(parseUserPreferencesPayload({ preferences: { foo: 1 } }), null);
  });
});
