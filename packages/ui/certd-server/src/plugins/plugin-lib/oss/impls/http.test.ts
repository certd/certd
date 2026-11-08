import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createServer } from "node:http";
import { createAxiosService, utils } from "@certd/basic";
import { ossClientFactory } from "../factory.js";
import HttpOssClientImpl from "./http.js";
import { HttpAccess } from "../../http/access.js";

describe("HttpOssClientImpl", () => {
  const logger = { info() {}, warn() {}, error() {}, debug() {} } as any;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "certd-http-test-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("通过工厂创建 HTTP 来源，等待完整内容写入并保留 URL 查询参数", async () => {
    const server = createServer((req, res) => {
      assert.equal(req.url, "/fullchain.pem?token=a%2Fb");
      res.write("certificate-");
      setTimeout(() => res.end("content"), 30);
    });
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    try {
      const port = (server.address() as any).port;
      const client = await ossClientFactory.createOssClientByType("http", {
        access: null,
        ctx: { logger, utils, accessService: {} as any, http: createAxiosService({ logger }) },
      });
      const localPath = path.join(tempDir, "cert.pem");
      await client.download(`http://127.0.0.1:${port}/fullchain.pem?token=a%2Fb`, localPath);
      assert.equal(await fs.readFile(localPath, "utf8"), "certificate-content");
    } finally {
      await new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
    }
  });

  it("通过 HTTP 授权向证书和私钥路径发送 POST、headers、body", async () => {
    const received: any[] = [];
    const server = createServer(async (req, res) => {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      received.push({ url: req.url, method: req.method, token: req.headers.authorization, body: Buffer.concat(chunks).toString() });
      res.end("pem-content");
    });
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    try {
      const port = (server.address() as any).port;
      const access = new HttpAccess();
      access.url = `http://127.0.0.1:${port}/ssl/`;
      access.method = "POST";
      access.headers = "Authorization=Bearer test-token\nContent-Type=application/json";
      access.body = '{"id":"cert-1"}';
      const ctx = { logger, utils, accessService: {} as any, http: createAxiosService({ logger }) };
      await access.setCtx(ctx);
      const client = await ossClientFactory.createOssClientByType("http", { access, ctx });
      for (const fileName of ["fullchain.pem", "privkey.pem"]) {
        const localPath = path.join(tempDir, fileName);
        await client.download(fileName, localPath);
        assert.equal(await fs.readFile(localPath, "utf8"), "pem-content");
      }
      assert.deepEqual(
        received,
        ["fullchain.pem", "privkey.pem"].map(fileName => ({
          url: `/ssl/${fileName}`,
          method: "POST",
          token: "Bearer test-token",
          body: access.body,
        }))
      );
    } finally {
      await new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
    }
  });

  it("授权测试拒绝重定向，不向目标转发敏感 header 或 body", async () => {
    const received: string[] = [];
    const server = createServer((req, res) => {
      received.push(req.url);
      res.writeHead(302, { Location: "/redirect-target" });
      res.end();
    });
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    try {
      const port = (server.address() as any).port;
      const access = new HttpAccess();
      access.url = `http://127.0.0.1:${port}/ssl/`;
      access.headers = "Authorization=Bearer test-token";
      await access.setCtx({ logger, utils, accessService: {} as any, http: createAxiosService({ logger }) });
      await assert.rejects(access.onTestRequest(), /302|重定向/);
      assert.deepEqual(received, ["/ssl/"]);
    } finally {
      await new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
    }
  });

  it("HTTPS 请求使用超时、大小限制，关闭请求 URL 和响应内容日志", async () => {
    const requests: any[] = [];
    const client = new HttpOssClientImpl({ access: null });
    await client.setCtx({
      logger,
      utils,
      http: {
        async request(config: any) {
          requests.push(config);
          return Buffer.from("key");
        },
      },
    });
    await client.download("https://example.com/privkey.pem?token=secret", path.join(tempDir, "key.pem"));
    assert.equal(requests[0].url, "https://example.com/privkey.pem?token=secret");
    assert.equal(requests[0].method, "GET");
    assert.ok(requests[0].timeout > 0);
    assert.ok(requests[0].maxContentLength > 0);
    assert.equal(requests[0].logReq, false);
    assert.equal(requests[0].logRes, false);
  });

  for (const url of ["file:///etc/ssl/private.key", "ftp://example.com/cert.pem", "/relative/cert.pem", "not-a-url"]) {
    it(`拒绝非 HTTP/HTTPS 地址：${url}`, async () => {
      const client = new HttpOssClientImpl({ access: null });
      await assert.rejects(client.download(url, path.join(tempDir, "cert.pem")), /HTTP|HTTPS/);
    });
  }

  it("下载错误向上抛出，不创建目标文件", async () => {
    const client = new HttpOssClientImpl({ access: null });
    const error = new Error("HTTP 404");
    await client.setCtx({
      logger,
      utils,
      http: {
        async request() {
          throw error;
        },
      },
    });
    const localPath = path.join(tempDir, "cert.pem");
    await assert.rejects(client.download("https://example.com/missing.pem", localPath), error);
    await assert.rejects(fs.stat(localPath), { code: "ENOENT" });
  });

  it("明确拒绝 HTTP 来源的上传、删除和列目录操作", async () => {
    const client = new HttpOssClientImpl({ access: null });
    await assert.rejects(client.upload("file", Buffer.from("content")), /不支持/);
    await assert.rejects(client.remove("file"), /不支持/);
    await assert.rejects(client.listDir("dir"), /不支持/);
  });
});
