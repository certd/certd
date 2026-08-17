/// <reference types="mocha" />
/// <reference types="node" />

import assert from "node:assert/strict";

import { getReleaseMode, normalizeReleaseVersion } from "./app-controller.js";

describe("AppController.normalizeReleaseVersion", () => {
  it("normalizes AtomGit release tag names", () => {
    assert.equal(normalizeReleaseVersion({ tag_name: "v1.40.0" }), "1.40.0");
    assert.equal(normalizeReleaseVersion({ tag_name: "1.40.0" }), "1.40.0");
  });

  it("falls back to release name when tag_name is empty", () => {
    assert.equal(normalizeReleaseVersion({ name: "v1.40.0" }), "1.40.0");
  });
});

describe("AppController.getReleaseMode", () => {
  it("returns 'latest' when env var is not set", () => {
    delete process.env.certd_release_mode;
    assert.equal(getReleaseMode(), "latest");
  });

  it("returns 'latest' when env var is empty", () => {
    process.env.certd_release_mode = "";
    assert.equal(getReleaseMode(), "latest");
  });

  it("returns 'stable' when env var is 'stable'", () => {
    process.env.certd_release_mode = "stable";
    assert.equal(getReleaseMode(), "stable");
  });

  it("returns 'latest' when env var is an unknown value", () => {
    process.env.certd_release_mode = "unknown";
    assert.equal(getReleaseMode(), "latest");
  });

  after(() => {
    delete process.env.certd_release_mode;
  });
});
