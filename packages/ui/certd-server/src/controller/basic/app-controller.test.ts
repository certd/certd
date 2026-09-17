/// <reference types="mocha" />
/// <reference types="node" />

import assert from "node:assert/strict";

import { normalizeReleaseVersion } from "./app-controller.js";

describe("AppController.normalizeReleaseVersion", () => {
  it("normalizes AtomGit release tag names", () => {
    assert.equal(normalizeReleaseVersion({ tag_name: "v1.40.0" }), "1.40.0");
    assert.equal(normalizeReleaseVersion({ tag_name: "1.40.0" }), "1.40.0");
  });

  it("falls back to release name when tag_name is empty", () => {
    assert.equal(normalizeReleaseVersion({ name: "v1.40.0" }), "1.40.0");
  });
});
