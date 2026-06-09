/// <reference types="mocha" />
/// <reference types="node" />

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { FileService } from "./file-service.js";

function createUploadFile(key: string) {
  const uploadRootDir = "./data/upload";
  const filePath = path.join(uploadRootDir, key);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, "test");
  return filePath;
}

describe("FileService.getFile", () => {
  let cwd: string;
  let oldCwd: string;

  beforeEach(() => {
    oldCwd = process.cwd();
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), "certd-file-service-"));
    process.chdir(cwd);
  });

  afterEach(() => {
    process.chdir(oldCwd);
    fs.rmSync(cwd, { recursive: true, force: true });
  });

  it("allows admin to read another user's private file", () => {
    const service = new FileService();
    const userIdMd5 = Buffer.from(Buffer.from("2").toString("base64")).toString("hex");
    const key = `/private/${userIdMd5}/2026_05_25/qr.png`;
    const expectedPath = createUploadFile(key);

    const filePath = service.getFile(key, 1, true);

    assert.equal(filePath, expectedPath);
  });
});
