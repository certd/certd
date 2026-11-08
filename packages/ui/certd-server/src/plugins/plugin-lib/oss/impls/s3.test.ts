import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import S3OssClientImpl from "./s3.js";

describe("S3OssClientImpl.download", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "certd-s3-test-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  function createClient(body: Readable) {
    const commands: any[] = [];
    const client = Object.create(S3OssClientImpl.prototype) as S3OssClientImpl;
    client.access = {
      bucket: "cert-bucket",
      async importRuntime() {
        return {
          GetObjectCommand: class {
            constructor(public input: any) {}
          },
        };
      },
    } as any;
    client.rootDir = "";
    client.client = {
      async send(command: any) {
        commands.push(command.input);
        return { Body: body };
      },
    };
    client.logger = { info() {} } as any;
    return { client, commands };
  }

  it("等待下载写入完成，对象 key 使用正斜杠", async () => {
    let finished = false;
    const body = Readable.from(
      (async function* () {
        yield "cert-";
        await new Promise(resolve => setTimeout(resolve, 30));
        finished = true;
        yield "content";
      })()
    );
    const { client, commands } = createClient(body);
    client.rootDir = "ssl";
    const localPath = path.join(tempDir, "cert.pem");
    await client.download("example.com/fullchain.pem", localPath);
    assert.equal(finished, true);
    assert.deepEqual(commands, [{ Bucket: "cert-bucket", Key: "ssl/example.com/fullchain.pem" }]);
    assert.equal(await fs.readFile(localPath, "utf8"), "cert-content");
  });

  it("读取流失败时向上传播错误", async () => {
    const error = new Error("S3 下载中断");
    const body = Readable.from(
      (async function* () {
        yield "partial-cert";
        throw error;
      })()
    );
    const { client } = createClient(body);
    await assert.rejects(client.download("cert.pem", path.join(tempDir, "cert.pem")), error);
  });
});
