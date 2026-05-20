/// <reference types="mocha" />
/// <reference types="node" />

import assert from "node:assert/strict";

import { getImageDownloadOptions, isImageFile } from "./file-controller.js";

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

  it("builds koa-send options that keep image cache headers at 3 days", () => {
    const options = getImageDownloadOptions("data/upload/public/user/logo.png");

    assert.equal(options?.maxage, 259200000);

    const headers: Record<string, string> = {};
    options?.setHeaders({
      setHeader(key: string, value: string) {
        headers[key] = value;
      },
    });

    assert.equal(headers["Cache-Control"], "public,max-age=259200");
  });

  it("does not build cache options for non-image files", () => {
    assert.equal(getImageDownloadOptions("data/upload/private/user/cert.pem"), undefined);
  });
});
