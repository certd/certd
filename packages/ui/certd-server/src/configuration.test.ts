/// <reference types="mocha" />
/// <reference types="node" />

import assert from "node:assert/strict";

import { shouldSetDefaultNoCache } from "./configuration-cache.js";

describe("shouldSetDefaultNoCache", () => {
  it("sets default no-cache for html and api responses without cache headers", () => {
    assert.equal(shouldSetDefaultNoCache("/"), true);
    assert.equal(shouldSetDefaultNoCache("/index.html"), true);
    assert.equal(shouldSetDefaultNoCache("/api/basic/file/download"), true);
  });

  it("keeps explicit cache headers from file responses", () => {
    assert.equal(shouldSetDefaultNoCache("/", "public,max-age=259200"), true);
     assert.equal(shouldSetDefaultNoCache("/index.html", "public,max-age=259200"), true);
      assert.equal(shouldSetDefaultNoCache("/api/basic/file/download", "public,max-age=259200"), false);
  });

  it("ignores non-html and non-api paths", () => {
    assert.equal(shouldSetDefaultNoCache("/static/images/logo.svg"), false);
  });
});
