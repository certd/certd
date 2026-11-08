import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import esmock from "esmock";
import { BaseOssClient, IOssClient } from "../api.js";

describe("OssClient.upload 文件路径兼容", function (this: Mocha.Suite) {
  this.timeout(20000);
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "certd-upload-test-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  async function createClient(type: string, error?: Error) {
    const uploads: { localPath: string; content: Buffer }[] = [];
    async function capture(localPath: string) {
      const content = await fs.readFile(localPath);
      uploads.push({ localPath, content });
      if (error) {
        throw error;
      }
    }
    const sshModule = {
      SshClient: class {
        async uploadFiles(options: any) {
          await capture(options.transports[0].localPath);
        }
      },
    };
    const mocks: Record<string, any> = {};
    if (type === "ftp") {
      mocks["../../ftp/index.js"] = {
        FtpClient: class {
          async connect(callback: any) {
            return await callback(this);
          }
          async upload(localPath: string) {
            await capture(localPath);
          }
        },
      };
    } else {
      mocks["../../ssh/index.js"] = sshModule;
    }
    let loaded: any;
    loaded = await esmock(`./${type}.js`, mocks);
    const client: BaseOssClient<any> = new loaded.default({ access: { sshAccess: "ssh-access" } });
    await client.setCtx({
      logger: {} as any,
      utils: {} as any,
      accessService: {
        async getById() {
          return {};
        },
      },
    });
    return { client, uploads };
  }

  for (const type of ["ssh", "sftp", "ftp"]) {
    for (const fail of [false, true]) {
      it(`${type} 文件路径上传${fail ? "失败" : "成功"}后保留源文件`, async () => {
        const content = Buffer.from([0, 1, 128, 255]);
        const sourcePath = path.join(tempDir, "本地 文件.pem");
        await fs.writeFile(sourcePath, content);
        let error: Error;
        if (fail) {
          error = new Error("上传失败");
        }
        const { client, uploads } = await createClient(type, error);
        const uploader: IOssClient = client;
        const result = uploader.upload("certificate.pem", sourcePath);
        if (fail) {
          await assert.rejects(result, error);
        } else {
          await result;
        }
        assert.equal(uploads[0].localPath, sourcePath);
        assert.deepEqual(uploads[0].content, content);
        assert.deepEqual(await fs.readFile(sourcePath), content);
      });

      it(`${type} Buffer 上传${fail ? "失败" : "成功"}后清理临时文件`, async () => {
        const content = Buffer.from([0, 1, 128, 255]);
        let error: Error;
        if (fail) {
          error = new Error("上传失败");
        }
        const { client, uploads } = await createClient(type, error);
        const result = client.upload(`certd-upload-${path.basename(tempDir)}.pem`, content);
        if (fail) {
          await assert.rejects(result, error);
        } else {
          await result;
        }
        assert.deepEqual(uploads[0].content, content);
        await assert.rejects(fs.stat(uploads[0].localPath), { code: "ENOENT" });
      });
    }
  }

  it("SFTP授权选择SCP时使用SCP上传", async () => {
    const uploadTypes: string[] = [];
    const loaded = await esmock("./sftp.js", {
      "../../ssh/index.js": {
        SshClient: class {
          async uploadFiles(options: any) {
            uploadTypes.push(options.uploadType);
          }
        },
      },
    });
    const client: BaseOssClient<any> = new loaded.default({ access: { sshAccess: "ssh-access", uploadType: "scp" } });
    await client.setCtx({
      logger: {} as any,
      utils: {} as any,
      accessService: {
        async getById() {
          return {};
        },
      },
    });
    await client.upload("certificate.pem", Buffer.from("certificate"));
    assert.deepEqual(uploadTypes, ["scp"]);
  });
});
