import assert from "node:assert/strict";
import { accessRegistry } from "@certd/pipeline";
import { HttpAccess } from "./access.js";

describe("HttpAccess", () => {
  async function createAccess() {
    const requests: any[] = [];
    const access = new HttpAccess();
    access.url = "https://example.com/ssl/";
    await access.setCtx({
      logger: {} as any,
      utils: {} as any,
      accessService: {} as any,
      http: {
        async request(config: any) {
          requests.push(config);
          return { status: 200, data: Buffer.from("certificate") };
        },
      } as any,
    });
    return { access, requests };
  }

  it("注册 HTTP 授权，URL、headers 和 body 加密保存", () => {
    const define: any = accessRegistry.get("http").define;
    assert.equal(define.input.url.required, true);
    for (const field of ["url", "headers", "body"]) {
      assert.equal(define.input[field].encrypt, true);
    }
  });

  it("按授权 URL 解析相对路径，默认 GET 且关闭敏感请求日志", async () => {
    const { access, requests } = await createAccess();
    const result = await access.doRequest("fullchain.pem?token=a%2Fb");
    assert.equal(result.toString(), "certificate");
    assert.equal(requests[0].url, "https://example.com/ssl/fullchain.pem?token=a%2Fb");
    assert.equal(requests[0].method, "GET");
    assert.equal(requests[0].responseType, "arraybuffer");
    assert.equal(requests[0].logReq, false);
    assert.equal(requests[0].logRes, false);
    assert.ok(requests[0].timeout > 0);
    assert.ok(requests[0].maxContentLength > 0);
  });

  it("发送自定义 method、headers 和原始 body，保留 header 值中的等号", async () => {
    const { access, requests } = await createAccess();
    access.method = "POST";
    access.headers = "Authorization=Bearer abc==\r\nContent-Type=application/json\n\n";
    access.body = '{"token":"secret"}';
    await access.doRequest("/api/cert");
    assert.equal(requests[0].url, "https://example.com/api/cert");
    assert.equal(requests[0].method, "POST");
    assert.deepEqual(requests[0].headers, { Authorization: "Bearer abc==", "Content-Type": "application/json" });
    assert.equal(requests[0].data, access.body);
  });

  it("支持同来源完整 URL，并保留完整 URL 的查询参数", async () => {
    const { access, requests } = await createAccess();
    await access.doRequest("https://example.com/key.pem?sign=a%2Fb");
    assert.equal(requests[0].url, "https://example.com/key.pem?sign=a%2Fb");
  });

  it("测试按钮使用授权 URL 和请求配置，不返回敏感响应内容", async () => {
    const { access, requests } = await createAccess();
    access.url = "https://example.com/api/check?token=secret";
    access.method = "POST";
    access.body = "test-body";
    assert.equal(await access.onTestRequest(), "ok");
    assert.equal(requests[0].url, access.url);
    assert.equal(requests[0].data, "test-body");
  });

  for (const input of [{ url: "" }, { url: "not-a-url" }, { url: "file:///etc/ssl" }, { method: "INVALID" }, { headers: "Authorization: secret" }]) {
    it("无效配置在请求前报错", async () => {
      const { access, requests } = await createAccess();
      Object.assign(access, input);
      await assert.rejects(access.doRequest("fullchain.pem"));
      assert.equal(requests.length, 0);
    });
  }

  for (const filePath of ["file:///etc/ssl/private.key", "https://other.example.com/cert.pem", "//other.example.com/cert.pem"]) {
    it(`拒绝非 HTTP 或跨来源路径，避免发送授权：${filePath}`, async () => {
      const { access, requests } = await createAccess();
      await assert.rejects(access.doRequest(filePath));
      assert.equal(requests.length, 0);
    });
  }

  it("请求失败向上传播", async () => {
    const { access } = await createAccess();
    const error = new Error("HTTP 401");
    access.ctx.http.request = async () => {
      throw error;
    };
    await assert.rejects(access.onTestRequest(), error);
  });
});
