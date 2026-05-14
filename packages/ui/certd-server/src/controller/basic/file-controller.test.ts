/// <reference types="mocha" />
/// <reference types="node" />

import assert from "node:assert/strict";

import { isImageFile } from "./file-controller.js";

describe("FileController.isImageFile", () => {
  it("detects uploaded logo image files", () => {
    assert.equal(isImageFile("data/upload/public/user/logo.PNG"), true);
    assert.equal(isImageFile("data/upload/public/user/logo.svg"), true);
    assert.equal(isImageFile("data/upload/public/user/logo.webp"), true);
  });

  it("does not treat non-image downloads as logo images", () => {
    assert.equal(isImageFile("data/upload/public/user/archive.zip"), false);
    assert.equal(isImageFile("data/upload/public/user/cert.pem"), false);
    assert.equal(isImageFile("data/upload/public/user/logo"), false);
  });
});
