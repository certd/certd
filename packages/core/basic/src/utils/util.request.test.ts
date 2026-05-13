import { expect } from "chai";
import { createAxiosService, HttpClient, setGlobalHeaders } from "./util.request.js";
import { ILogger } from "./util.log.js";

const testLogger = {
  info() {},
  error() {},
} as unknown as ILogger;

describe("util.request", () => {
  afterEach(() => {
    setGlobalHeaders({});
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
});
