/// <reference types="mocha" />

import assert from "node:assert/strict";
import crypto from "node:crypto";

import { WangsuAccess } from "./access.js";

type RecordedRequest = {
  url: string;
  method: string;
  headers: Record<string, string>;
  data?: unknown;
  returnOriginRes?: boolean;
};

/** 记录请求并按队列返回预置响应，模拟 ctx.http.request */
function createFakeHttp() {
  const calls: RecordedRequest[] = [];
  const queue: any[] = [];
  return {
    calls,
    queue,
    push(response: any) {
      queue.push(response);
      return this;
    },
    async request(req: RecordedRequest) {
      calls.push(req);
      const next = queue.shift();
      if (!next) {
        throw new Error("没有更多预置响应");
      }
      if (next.throw) {
        throw next.throw;
      }
      return next;
    },
  };
}

function createAccess(overrides: Record<string, any> = {}) {
  const access = new WangsuAccess();
  // 新数据：ApiKey 方式字段与 AccessKey 方式字段分开填写
  access.apiUser = "api-user";
  access.apiKey = "api-key";
  // 历史数据：只有 accessKeyId / accessKeySecret
  access.accessKeyId = "ak-sk-id";
  access.accessKeySecret = "ak-sk-secret";
  const http = createFakeHttp();
  access.ctx = {
    http,
    logger: { info() {}, warn() {}, error() {}, debug() {} },
  } as any;
  Object.assign(access, overrides);
  return { access, http };
}

/** RFC1123 GMT，用于校验日期格式 */
function isRfc1123Gmt(value: string) {
  return /^(Sun|Mon|Tue|Wed|Thu|Fri|Sat), \d{2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(value);
}

/** 取 Basic 头里的用户名与密码，用于校验鉴权使用的凭据 */
function parseBasicAuth(header: string) {
  const raw = Buffer.from(header.replace(/^Basic /, ""), "base64").toString("utf8");
  const index = raw.indexOf(":");
  return { user: raw.substring(0, index), password: raw.substring(index + 1) };
}

/** CDN Pro 用的原始响应对象（returnOriginRes） */
function cdnProResponse({ status = 200, headers = {}, data = null }: { status?: number; headers?: Record<string, string>; data?: any } = {}) {
  return { status, headers, data };
}

describe("WangsuAccess 授权方式", () => {
  it("旧数据没有 authType 时默认走 aksk 签名", async () => {
    const { access, http } = createAccess({ authType: undefined });
    http.push({ sslCertificate: [] });

    await access.getCertList({});

    assert.equal(http.calls.length, 1);
    assert.equal(http.calls[0].method, "GET");
    assert.match(http.calls[0].url, /^https:\/\/open\.chinanetcenter\.com\/api\/ssl\/certificate$/);
    assert.match(http.calls[0].headers["Authorization"], /^CNC-HMAC-SHA256 /);
    assert.equal(http.calls[0].headers["x-cnc-accessKey"], "ak-sk-id");
  });

  it("authType=aksk 时沿用老接口与签名方式", async () => {
    const { access, http } = createAccess({ authType: "aksk" });
    http.push({ sslCertificate: [] });

    await access.getCertList({});

    assert.equal(http.calls[0].method, "GET");
    assert.match(http.calls[0].url, /\/api\/ssl\/certificate$/);
    assert.match(http.calls[0].headers["Authorization"], /^CNC-HMAC-SHA256 /);
    assert.equal(http.calls[0].headers["x-cnc-accessKey"], "ak-sk-id");
  });

  it("authType=apikey 时改用 CDN Pro 的 HTTP Basic 鉴权", async () => {
    const { access, http } = createAccess({ authType: "apikey" });
    http.push(cdnProResponse({ data: { count: 0, certificates: [] } }));

    await access.getCertList({});

    const call = http.calls[0];
    assert.equal(call.method, "GET");
    assert.equal(call.url, "https://open.chinanetcenter.com/cdn/certificates?limit=200");
    assert.match(call.headers["Authorization"], /^Basic /);
    assert.ok(isRfc1123Gmt(call.headers["Date"]), `Date 头格式错误：${call.headers["Date"]}`);
    assert.equal(call.returnOriginRes, true);

    // 用户名取 ApiKey 方式专属字段，密码必须是 Base64(HMAC-SHA1(API Key, Date))
    const parsed = parseBasicAuth(call.headers["Authorization"]);
    assert.equal(parsed.user, "api-user");
    const expectedPassword = crypto.createHmac("sha1", "api-key").update(call.headers["Date"]).digest("base64");
    assert.equal(parsed.password, expectedPassword);
  });

  it("apikey 方式兼容历史数据：ApiKey 专属字段为空时回退到 accessKeyId/accessKeySecret", async () => {
    const { access, http } = createAccess({ authType: "apikey", apiUser: undefined, apiKey: undefined });
    http.push(cdnProResponse({ data: { count: 0, certificates: [] } }));

    await access.getCertList({});

    const parsed = parseBasicAuth(http.calls[0].headers["Authorization"]);
    assert.equal(parsed.user, "ak-sk-id");
    const expectedPassword = crypto.createHmac("sha1", "ak-sk-secret").update(http.calls[0].headers["Date"]).digest("base64");
    assert.equal(parsed.password, expectedPassword);
  });

  it("apikey 方式缺少凭据时抛出明确错误", async () => {
    const { access } = createAccess({ authType: "apikey", apiUser: "", apiKey: "", accessKeyId: "", accessKeySecret: "" });

    await assert.rejects(() => access.doRequest({ url: "/cdn/certificates?limit=1", method: "GET" }), /网宿授权中缺少 CDN Pro 的 API 账号名或 API Key/);
  });

  it("未选择 ApiKey 方式时，ApiKey 专属接口给出明确指引", () => {
    const { access } = createAccess({ authType: "aksk" });

    assert.throws(() => access.encryptPrivateKey("MOCK-KEY"), /当前授权未选择「ApiKey（CDN Pro）」鉴权方式/);
  });

  it("requireApiKeyAuth 在 apikey 方式下放行，在 aksk 方式下报错", () => {
    const { access } = createAccess({ authType: "apikey" });
    assert.doesNotThrow(() => access.requireApiKeyAuth());

    const akskAccess = createAccess({ authType: "aksk" }).access;
    assert.throws(() => akskAccess.requireApiKeyAuth(), /当前授权未选择「ApiKey（CDN Pro）」鉴权方式/);
  });

  it("doRequest 传入 dateStr 时用该 Date 鉴权，保证与私钥加密用的是同一个 Date", async () => {
    const { access, http } = createAccess({ authType: "apikey" });
    http.push(cdnProResponse({ status: 201, headers: { location: "https://x/cdn/certificates/cert-1/versions/2" }, data: "" }));
    const dateStr = "Sat, 19 Sep 2026 14:20:02 GMT";

    await access.doRequest({ url: "/cdn/certificates/cert-1", method: "PATCH", dateStr });

    assert.equal(http.calls[0].headers["Date"], dateStr);
    const parsed = parseBasicAuth(http.calls[0].headers["Authorization"]);
    const expectedPassword = crypto.createHmac("sha1", "api-key").update(dateStr).digest("base64");
    assert.equal(parsed.password, expectedPassword);
  });

  it("apikey 方式 doRequest 返回原始响应，便于调用方读取 Location 等响应头", async () => {
    const { access, http } = createAccess({ authType: "apikey" });
    const headers = { location: "https://x/cdn/certificates/cert-1/versions/2" };
    http.push(cdnProResponse({ status: 201, headers, data: "" }));

    const res: any = await access.doRequest({ url: "/cdn/certificates/cert-1", method: "PATCH" });

    // 部署插件正是靠这里的 status 与 headers.location 拿新版本号
    assert.equal(res.status, 201);
    assert.equal(res.headers.location, headers.location);
  });

  it("aksk 方式 doRequest 也返回统一的 {data,status,headers} 结构", async () => {
    const { access, http } = createAccess({ authType: "aksk" });
    http.push({ sslCertificate: [{ certificateId: "c1" }] });

    const res: any = await access.doRequest({ url: "/api/ssl/certificate", method: "GET" });

    assert.equal(res.status, 200);
    assert.equal(res.headers, null);
    assert.deepEqual(res.data, { sslCertificate: [{ certificateId: "c1" }] });
  });

  it("getCertList 从原始响应里取出证书数组，并带上域名 dnsNames", async () => {
    const { access, http } = createAccess({ authType: "apikey" });
    const certificates = [{ id: "cert-1", name: "证书1", dnsNames: ["a.example.com"] }];
    http.push(cdnProResponse({ data: { count: 1, certificates } }));

    const list = await access.getCertList({});

    assert.deepEqual(list, certificates);
  });

  it("getCertDnsNames 兼容 dnsNames / dns_names / domains 三种域名写法", () => {
    assert.deepEqual(WangsuAccess.getCertDnsNames({ dnsNames: ["a.example.com"] }), ["a.example.com"]);
    assert.deepEqual(WangsuAccess.getCertDnsNames({ dns_names: ["b.example.com"] }), ["b.example.com"]);
    assert.deepEqual(WangsuAccess.getCertDnsNames({ domains: ["c.example.com"] }), ["c.example.com"]);
    // 单个字符串也统一成数组
    assert.deepEqual(WangsuAccess.getCertDnsNames({ dnsNames: "d.example.com" }), ["d.example.com"]);
    // 没有域名信息时返回空数组，交给调用方提示，不要抛异常
    assert.deepEqual(WangsuAccess.getCertDnsNames({ id: "cert-1" }), []);
    assert.deepEqual(WangsuAccess.getCertDnsNames(null), []);
  });

  it("apikey 方式下 PATCH 证书把请求体透传", async () => {
    const { access, http } = createAccess({ authType: "apikey" });
    http.push(cdnProResponse({ status: 201, headers: { location: "https://x/cdn/certificates/cert-1/versions/2" }, data: "" }));

    await access.doRequest({
      url: "/cdn/certificates/cert-1",
      method: "PATCH",
      data: { newVersion: { certificate: "crt" } },
    });

    assert.deepEqual(http.calls[0].data, { newVersion: { certificate: "crt" } });
  });

  it("apikey 方式报错时带上 HTTP 状态码与响应内容", async () => {
    const { access, http } = createAccess({ authType: "apikey" });
    const err: any = new Error("Request failed with status code 401");
    err.status = 401;
    err.response = { status: 401, data: { status: 0, result: "The HTTP authorization header is bad: account name does not exist." } };
    http.push({ throw: err });

    await assert.rejects(() => access.doRequest({ url: "/cdn/certificates?limit=1", method: "GET" }), /The HTTP authorization header is bad: account name does not exist.（HTTP 401）/);
  });

  it("apikey 方式返回非 2xx 状态码时抛出异常", async () => {
    const { access, http } = createAccess({ authType: "apikey" });
    http.push(cdnProResponse({ status: 403, data: { code: "AccessDenied", message: "Please enter valid credentials." } }));

    await assert.rejects(() => access.doRequest({ url: "/cdn/certificates?limit=1", method: "GET" }), /\[AccessDenied\] Please enter valid credentials.（HTTP 403）/);
  });

  it("aksk 方式报错时保留服务端 result 摘要", async () => {
    const { access, http } = createAccess({ authType: "aksk" });
    const err: any = new Error("Request failed with status code 462");
    err.response = { data: { status: 0, result: "authorization is error! please check signature, accessKey!" } };
    http.push({ throw: err });

    await assert.rejects(() => access.doRequest({ url: "/api/ssl/certificate", method: "GET" }), /authorization is error! please check signature, accessKey!/);
  });

  it("onTestRequest 在 apikey 方式下走 CDN Pro 证书列表接口", async () => {
    const { access, http } = createAccess({ authType: "apikey" });
    http.push(cdnProResponse({ data: { count: 0, certificates: [] } }));

    assert.equal(await access.onTestRequest(), "ok");
    assert.match(http.calls[0].url, /\/cdn\/certificates/);
  });

  it("encryptPrivateKey 用 ApiKey 与同一个 Date 派生 Key/IV 加密私钥，可解回原文", () => {
    const { access } = createAccess({ authType: "apikey" });
    const privateKey = "-----BEGIN PRIVATE KEY-----\nMOCK\n-----END PRIVATE KEY-----";

    const result = access.encryptPrivateKey(privateKey);

    // 返回的 Date 必须能用于同一把钥匙解密，调用方靠它保证鉴权头与加密用同一个 Date
    assert.ok(isRfc1123Gmt(result.dateStr), `Date 格式错误：${result.dateStr}`);
    const hexKey = crypto.createHmac("sha256", "api-key").update(result.dateStr).digest("hex");
    const iv = Buffer.from(hexKey.substring(0, 32), "hex");
    const key = Buffer.from(hexKey.substring(32, 64), "hex");
    const decipher = crypto.createDecipheriv("aes-128-cbc", key, iv);
    const decrypted = Buffer.concat([decipher.update(Buffer.from(result.privateKey, "base64")), decipher.final()]).toString("utf8");
    assert.equal(decrypted, privateKey);
  });

  it("encryptPrivateKey 兼容历史授权：ApiKey 字段为空时用 accessKeySecret 派生", () => {
    const { access } = createAccess({ authType: "apikey", apiUser: undefined, apiKey: undefined });
    const privateKey = "MOCK-KEY";

    const result = access.encryptPrivateKey(privateKey);

    const hexKey = crypto.createHmac("sha256", "ak-sk-secret").update(result.dateStr).digest("hex");
    const iv = Buffer.from(hexKey.substring(0, 32), "hex");
    const key = Buffer.from(hexKey.substring(32, 64), "hex");
    const decipher = crypto.createDecipheriv("aes-128-cbc", key, iv);
    const decrypted = Buffer.concat([decipher.update(Buffer.from(result.privateKey, "base64")), decipher.final()]).toString("utf8");
    assert.equal(decrypted, privateKey);
  });

  it("encryptPrivateKey 缺少凭据时抛出与请求一致的错误", () => {
    const { access } = createAccess({ authType: "apikey", apiUser: "", apiKey: "", accessKeyId: "", accessKeySecret: "" });

    assert.throws(() => access.encryptPrivateKey("MOCK-KEY"), /网宿授权中缺少 CDN Pro 的 API 账号名或 API Key/);
  });

  it("encryptPrivateKey 在未选择 ApiKey 方式时直接报错", () => {
    const { access } = createAccess({ authType: "aksk" });

    assert.throws(() => access.encryptPrivateKey("MOCK-KEY"), /当前授权未选择「ApiKey（CDN Pro）」鉴权方式/);
  });
});
