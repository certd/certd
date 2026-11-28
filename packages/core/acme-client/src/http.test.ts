import assert from "node:assert/strict";
import esmock from "esmock";
import HttpClient from "./http.js";

declare const describe: any;
declare const it: any;

describe("acme-client directory egress policy", () => {
  const makeClient = (directoryUrl: string, urlMapping: any = {}) => new HttpClient(directoryUrl, "key", {}, urlMapping, { info() {}, warn() {}, error() {}, debug() {} });

  it("同源资源URL放行", () => {
    const client = makeClient("https://ca.example.com/api/acme/1/directory");
    assert.doesNotThrow(() => client.assertResourceSameOrigin("newNonce", "https://ca.example.com/api/acme/1/new-nonce"));
  });

  it("第三方ACME可显式放宽跨源资源检查，默认仍严格", () => {
    const strict = new HttpClient("https://ca.example.com/directory", "key", {}, {}, { info() {}, warn() {}, error() {}, debug() {} });
    assert.throws(() => strict.assertResourceSameOrigin("newAccount", "https://cdn.example.net/new-account"), /不同源/);
    const compatible = new HttpClient("https://ca.example.com/directory", "key", {}, {}, { info() {}, warn() {}, error() {}, debug() {} }, false, {}, { strictResourceOrigin: false });
    assert.doesNotThrow(() => compatible.assertResourceSameOrigin("newAccount", "https://cdn.example.net/new-account"));
  });

  it("跨源资源URL拒绝（防止凭证外泄/SSRF）", () => {
    const client = makeClient("https://ca.example.com/api/acme/1/directory");
    assert.throws(() => client.assertResourceSameOrigin("newAccount", "https://evil.example.com/new-account"), /不同源/);
  });

  it("非法资源URL拒绝", () => {
    const client = makeClient("https://ca.example.com/directory");
    assert.throws(() => client.assertResourceSameOrigin("newNonce", "not-a-url"), /不同源/);
  });

  it("资源URL命中可信映射规则时允许跨源", () => {
    const client = makeClient("https://ca.example.com/directory", { enabled: true, mappings: { "https://other.example.com": "https://proxy.example.com" } });
    assert.doesNotThrow(() => client.assertResourceSameOrigin("newNonce", "https://other.example.com/new-nonce"));
  });

  it("开启映射但资源URL未命中规则时仍执行同源检查", () => {
    const client = makeClient("https://ca.example.com/directory", { enabled: true, mappings: { "https://other.example.com": "https://proxy.example.com" } });
    assert.throws(() => client.assertResourceSameOrigin("newAccount", "https://evil.example.com/new-account"), /不同源/);
  });
});

describe("acme-client URL Mapping 严格同源", () => {
  const makeClient = (mappings: any) => new HttpClient("https://ca.example.com/directory", "key", {}, { enabled: true, mappings }, { info() {}, warn() {}, error() {}, debug() {} });

  it("正常源地址映射命中并替换origin", () => {
    const client = makeClient({ "https://other.example.com": "https://proxy.example.com" });
    assert.equal(client.mapUrl("https://other.example.com/api/acme/1/new-nonce"), "https://proxy.example.com/api/acme/1/new-nonce");
  });

  it("相同域名不同端口不命中", () => {
    const client = makeClient({ "https://other.example.com": "https://proxy.example.com" });
    assert.equal(client.mapUrl("https://other.example.com:8443/new-nonce"), null);
  });

  it("不同协议不命中", () => {
    const client = makeClient({ "https://other.example.com": "https://proxy.example.com" });
    assert.equal(client.mapUrl("http://other.example.com/new-nonce"), null);
  });

  it("恶意query包含可信域名不命中", () => {
    const client = makeClient({ "https://other.example.com": "https://proxy.example.com" });
    assert.equal(client.mapUrl("https://evil.example.com/new-nonce?ref=https://other.example.com"), null);
  });

  it("恶意path包含可信域名不命中", () => {
    const client = makeClient({ "https://other.example.com": "https://proxy.example.com" });
    assert.equal(client.mapUrl("https://evil.example.com/https://other.example.com/new-nonce"), null);
  });

  it("URL用户信息字段混淆origin不命中", () => {
    const client = makeClient({ "https://other.example.com": "https://proxy.example.com" });
    assert.equal(client.mapUrl("https://other.example.com@evil.example.com/new-nonce"), null);
  });

  it("路径前缀按边界匹配", () => {
    const client = makeClient({ "https://other.example.com/api": "https://proxy.example.com/back" });
    assert.equal(client.mapUrl("https://other.example.com/api/acme/1"), "https://proxy.example.com/back/acme/1");
    assert.equal(client.mapUrl("https://other.example.com/apix/acme/1"), null);
  });

  it("回环与私网目标不因映射放行同源检查", () => {
    const client = makeClient({ "https://other.example.com": "https://proxy.example.com" });
    assert.throws(() => client.assertResourceSameOrigin("newNonce", "https://127.0.0.1/new-nonce"), /不同源/);
    assert.throws(() => client.assertResourceSameOrigin("newNonce", "https://10.0.0.1/new-nonce"), /不同源/);
  });
});

describe("acme-client 内部凭证重定向保护", () => {
  async function loadClient(extraHeaders: any, options: any = {}) {
    const captured: any[] = [];
    const fakeAxios = {
      defaults: { acmeSettings: { maxRedirects: 5 } },
      request: async (opts: any) => {
        captured.push(opts);
        return { status: 200, headers: {} };
      },
    };
    const { default: HttpClientMocked } = await esmock("./http.js", { "./axios.js": { default: fakeAxios } });
    const client = new HttpClientMocked("https://ca.example.com/api/acme/1/directory", "key", {}, {}, { info() {}, warn() {}, error() {}, debug() {} }, false, extraHeaders, options);
    return { client, captured };
  }

  it("携带内部凭证的同源请求禁止重定向", async function (this: any) {
    this.timeout(20000);
    const { client, captured } = await loadClient({ "x-certd-acme-token": "tok" });
    await client.request("https://ca.example.com/api/acme/1/new-nonce", "get");
    assert.equal(captured[0].maxRedirects, 0);
    assert.equal(captured[0].headers["x-certd-acme-token"], "tok");
  });

  it("第三方ACME可按客户端覆盖重定向配置", async function (this: any) {
    this.timeout(20000);
    const { client, captured } = await loadClient({}, { maxRedirects: 2 });
    await client.request("https://ca.example.com/api/acme/1/new-nonce", "get");
    assert.equal(captured[0].maxRedirects, 2);
  });

  it("跨源请求不附加内部凭证且保留重定向配置", async function (this: any) {
    this.timeout(20000);
    const { client, captured } = await loadClient({ "x-certd-acme-token": "tok" });
    await client.request("https://other.example.com/new-nonce", "get");
    assert.equal(captured[0].headers["x-certd-acme-token"], undefined);
    assert.equal(captured[0].maxRedirects, 5);
  });
});