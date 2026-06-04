import { expect } from "chai";
import { createAgent, createAxiosService, getGlobalAgents, HttpClient, isNoProxyMatched, setGlobalHeaders, setGlobalProxy } from "./util.request.js";
import { ILogger } from "./util.log.js";

const testLogger = {
  debug() {},
  info() {},
  error() {},
} as unknown as ILogger;

describe("util.request", () => {
  afterEach(() => {
    setGlobalHeaders({});
    setGlobalProxy({});
    delete process.env.NO_PROXY;
    delete process.env.no_proxy;
  });

  it("should merge global headers without overriding request headers", async () => {
    setGlobalHeaders({
      "X-Common": "common",
      "X-Override": "global",
    });

    const http = createAxiosService({ logger: testLogger }) as HttpClient;
    const res = await http.request({
      url: "http://example.com",
      method: "get",
      logReq: false,
      logRes: false,
      headers: {
        "X-Override": "request",
        "X-Request": "request",
      },
      adapter: async config => {
        const headers = config.headers;
        return {
          config,
          data: {
            common: headers.get("X-Common"),
            override: headers.get("X-Override"),
            request: headers.get("X-Request"),
          },
          headers: {},
          status: 200,
          statusText: "OK",
        };
      },
    });

    expect(res).to.deep.equal({
      common: "common",
      override: "request",
      request: "request",
    });
  });

  it("should set no_proxy environment variables", () => {
    setGlobalProxy({
      httpProxy: "http://127.0.0.1:1080",
      httpsProxy: "http://127.0.0.1:1080",
      noProxy: "localhost,*.internal.example.com",
    });

    expect(process.env.NO_PROXY).to.equal("localhost,*.internal.example.com");
    expect(process.env.no_proxy).to.equal("localhost,*.internal.example.com");
  });

  it("should normalize multiline no_proxy environment variables", () => {
    setGlobalProxy({
      noProxy: "localhost\n127.0.0.1, 192.168.*\n*.internal.example.com",
    });

    expect(process.env.NO_PROXY).to.equal("localhost,127.0.0.1,192.168.*,*.internal.example.com");
    expect(process.env.no_proxy).to.equal("localhost,127.0.0.1,192.168.*,*.internal.example.com");
  });

  it("should not change environment variables when creating agents", () => {
    process.env.HTTP_PROXY = "http://old-http-proxy";
    process.env.HTTPS_PROXY = "http://old-https-proxy";
    process.env.NO_PROXY = "old.local";

    createAgent({
      httpProxy: "http://127.0.0.1:1080",
      httpsProxy: "http://127.0.0.1:1081",
    });

    expect(process.env.HTTP_PROXY).to.equal("http://old-http-proxy");
    expect(process.env.HTTPS_PROXY).to.equal("http://old-https-proxy");
    expect(process.env.NO_PROXY).to.equal("old.local");
  });

  it("should bypass global proxy when request host matches no_proxy", async () => {
    setGlobalProxy({
      httpProxy: "http://127.0.0.1:1080",
      httpsProxy: "http://127.0.0.1:1080",
      noProxy: "localhost,.internal.example.com",
    });

    const globalAgents = getGlobalAgents();
    const http = createAxiosService({ logger: testLogger }) as HttpClient;
    const res = await http.request({
      url: "https://api.internal.example.com",
      method: "get",
      logReq: false,
      logRes: false,
      adapter: async config => {
        return {
          config,
          data: {
            usesGlobalHttpAgent: config.httpAgent === globalAgents.httpAgent,
            usesGlobalHttpsAgent: config.httpsAgent === globalAgents.httpsAgent,
          },
          headers: {},
          status: 200,
          statusText: "OK",
        };
      },
    });

    expect(res).to.deep.equal({
      usesGlobalHttpAgent: false,
      usesGlobalHttpsAgent: false,
    });
  });

  it("should bypass custom request proxy when request host matches no_proxy", async () => {
    setGlobalProxy({
      noProxy: ".internal.example.com",
    });

    const http = createAxiosService({ logger: testLogger }) as HttpClient;
    const res = await http.request({
      url: "https://api.internal.example.com",
      method: "get",
      httpProxy: "http://127.0.0.1:1080",
      logReq: false,
      logRes: false,
      adapter: async config => {
        return {
          config,
          data: {
            httpAgent: config.httpAgent?.constructor?.name,
            httpsAgent: config.httpsAgent?.constructor?.name,
          },
          headers: {},
          status: 200,
          statusText: "OK",
        };
      },
    });

    expect(res).to.deep.equal({
      httpAgent: "Agent",
      httpsAgent: "Agent",
    });
  });

  it("should match no_proxy rules", () => {
    expect(isNoProxyMatched("*", { hostname: "api.example.com", port: "" })).to.equal(true);
    expect(isNoProxyMatched("api.example.com", { hostname: "api.example.com", port: "" })).to.equal(true);
    expect(isNoProxyMatched("example.com", { hostname: "api.example.com", port: "" })).to.equal(true);
    expect(isNoProxyMatched(".example.com", { hostname: "api.example.com", port: "" })).to.equal(true);
    expect(isNoProxyMatched("*.example.com", { hostname: "api.example.com", port: "" })).to.equal(true);
    expect(isNoProxyMatched("127.0.0.1", { hostname: "127.0.0.1", port: "" })).to.equal(true);
    expect(isNoProxyMatched("192.168.*", { hostname: "192.168.1.10", port: "" })).to.equal(true);
    expect(isNoProxyMatched("192.168.*", { hostname: "192.169.1.10", port: "" })).to.equal(false);
    expect(isNoProxyMatched("[::1]", { hostname: "::1", port: "" })).to.equal(true);
    expect(isNoProxyMatched("[::1]:8443", { hostname: "::1", port: "8443" })).to.equal(true);
    expect(isNoProxyMatched("api.example.com:8443", { hostname: "api.example.com", port: "8443" })).to.equal(true);
    expect(isNoProxyMatched("api.example.com:8443", { hostname: "api.example.com", port: "443" })).to.equal(false);
    expect(isNoProxyMatched("127.0.0.1", { hostname: "127.0.0.2", port: "" })).to.equal(false);
    expect(isNoProxyMatched(".example.com", { hostname: "example.org", port: "" })).to.equal(false);
  });
});
