import assert from "node:assert/strict";
import HttpClient from "./http.js";

declare const describe: any;
declare const it: any;

describe("acme-client directory egress policy", () => {
  const makeClient = (directoryUrl: string, urlMapping: any = {}) => new HttpClient(directoryUrl, "key", {}, urlMapping, { info() {}, warn() {}, error() {}, debug() {} });

  it("同源资源URL放行", () => {
    const client = makeClient("https://ca.example.com/api/acme/1/directory");
    assert.doesNotThrow(() => client.assertResourceSameOrigin("newNonce", "https://ca.example.com/api/acme/1/new-nonce"));
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