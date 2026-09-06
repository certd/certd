import assert from "node:assert/strict";
import { FastlyAccess } from "./access.js";
import { FastlyUploadCertPlugin } from "./plugins/plugin-upload-cert.js";
import { FastlyPurgeCachePlugin } from "./plugins/plugin-purge-cache.js";
import { FastlyDeployCertPlugin } from "./plugins/plugin-deploy-to-service.js";
import { FastlyRefreshCertPlugin } from "./plugins/plugin-refresh-cert.js";
const mockCert = {
  crt: "-----BEGIN CERTIFICATE-----\nMOCKCERT\n-----END CERTIFICATE-----\n-----BEGIN CERTIFICATE-----\nMOCKINTERMEDIATE\n-----END CERTIFICATE-----",
  key: "-----BEGIN PRIVATE KEY-----\nMOCKKEY\n-----END PRIVATE KEY-----",
};

// Real FastlyAccess so plugins exercise its createCertificate/updateCertificate
// helpers; only the low-level doRequestApi is stubbed.
function fakeAccess(doRequestApi: (path: string, payload: any, method: string) => any) {
  const access = new FastlyAccess();
  (access as any).ctx = { logger: { info: () => {}, error: () => {} } };
  (access as any).doRequestApi = doRequestApi;
  return access;
}

describe("FastlyAccess", () => {
  it("should build correct request headers and URL for POST", async () => {
    const access = new FastlyAccess();
    access.apiKey = "test-fastly-key";

    let capturedReq: any = null;
    (access as any).ctx = {
      http: {
        request: async (req: any) => {
          capturedReq = req;
          return { data: { id: "tls_cert_123" } };
        },
      },
      logger: { info: () => {}, error: () => {} },
    };

    const res = await access.doRequestApi("/tls/certificates", { test: true }, "post");

    assert.equal(capturedReq.url, "https://api.fastly.com/tls/certificates");
    assert.equal(capturedReq.headers["Fastly-Key"], "test-fastly-key");
    assert.equal(capturedReq.headers["Accept"], "application/vnd.api+json");
    assert.equal(capturedReq.headers["Content-Type"], "application/vnd.api+json");
    assert.equal(res.data.id, "tls_cert_123");
  });

  it("should NOT set Content-Type for GET requests", async () => {
    const access = new FastlyAccess();
    access.apiKey = "test-key";

    let capturedReq: any = null;
    (access as any).ctx = {
      http: {
        request: async (req: any) => {
          capturedReq = req;
          return { data: [] };
        },
      },
      logger: { info: () => {}, error: () => {} },
    };

    await access.doRequestApi("/tls/certificates?page[size]=1", null, "get");
    assert.equal(capturedReq.headers["Content-Type"], undefined);
    assert.equal(capturedReq.headers["Fastly-Key"], "test-key");
  });

  it("should pass proxy to http request when proxy is set", async () => {
    const access = new FastlyAccess();
    access.apiKey = "test-key";
    access.proxy = "http://proxy.example.com:3128";

    let capturedReq: any = null;
    (access as any).ctx = {
      http: {
        request: async (req: any) => {
          capturedReq = req;
          return {};
        },
      },
      logger: { info: () => {}, error: () => {} },
    };

    await access.doRequestApi("/tls/certificates", null, "get");
    assert.equal(capturedReq.httpProxy, "http://proxy.example.com:3128");
  });
});

describe("FastlyAccess list helpers", () => {
  function mockAccess(handler: (url: string) => any) {
    const access = new FastlyAccess();
    access.apiKey = "k";
    (access as any).ctx = {
      http: { request: async (req: any) => handler(req.url) },
      logger: { info: () => {}, error: () => {} },
    };
    return access;
  }

  it("getCertificates returns body.data (not body.data.data) and aggregates all pages", async () => {
    const urls: string[] = [];
    const access = mockAccess((url: string) => {
      urls.push(url);
      const page = Number(url.match(/page\[number\]=(\d+)/)?.[1]);
      // 3 pages total, 2 items each
      const pageItems = [
        [{ id: "c1" }, { id: "c2" }],
        [{ id: "c3" }, { id: "c4" }],
        [{ id: "c5" }, { id: "c6" }],
      ];
      return { data: pageItems[page - 1] ?? [], meta: { total_pages: 3 } };
    });

    const list = await access.getCertificates();
    assert.deepEqual(
      list.map((x: any) => x.id),
      ["c1", "c2", "c3", "c4", "c5", "c6"]
    );
    assert.equal(urls.length, 3);
  });

  it("stops paginating on a short page when total_pages is absent", async () => {
    let calls = 0;
    const access = mockAccess(() => {
      calls++;
      // single short page (< pageSize) => no more requests
      return { data: [{ id: "d1" }] };
    });

    const list = await access.getTlsDomains();
    assert.deepEqual(list, [{ id: "d1" }]);
    assert.equal(calls, 1);
  });

  it("getServices unwraps a bare array response", async () => {
    const access = mockAccess(() => [{ id: "svc1", name: "a" }]);
    const list = await access.getServices();
    assert.deepEqual(list, [{ id: "svc1", name: "a" }]);
  });

  it("getServiceDomains collects domains from each service's active version", async () => {
    const access = mockAccess((url: string) => {
      if (url.endsWith("/service?per_page=200")) {
        return [
          {
            id: "svc1",
            versions: [
              { number: 1, active: false },
              { number: 2, active: true },
            ],
          },
          { id: "svc2", version: 5 },
        ];
      }
      if (url.endsWith("/service/svc1/version/2/domain")) {
        return [{ name: "www.g0l.net" }, { name: "img.g0l.net" }];
      }
      if (url.endsWith("/service/svc2/version/5/domain")) {
        return [{ name: "www.g0l.net" }, { name: "api.other.net" }];
      }
      throw new Error(`unexpected ${url}`);
    });

    const domains = await access.getServiceDomains();
    assert.deepEqual(domains.sort(), ["api.other.net", "img.g0l.net", "www.g0l.net"]);
  });
});

describe("FastlyUploadCertPlugin - new certificate (2-step flow)", () => {
  it("should upload private key first then create certificate with relationship", async () => {
    const plugin = new FastlyUploadCertPlugin();
    plugin.cert = mockCert as any;
    plugin.accessId = "access-1";
    plugin.name = "my-cert";

    const calls: { path: string; payload: any; method: string }[] = [];

    const mockAccess = fakeAccess(async (path: string, payload: any, method: string) => {
      calls.push({ path, payload, method });
      if (path === "/tls/private_keys") {
        return { data: { id: "pk_abc123" } };
      }
      if (path === "/tls/certificates") {
        return { data: { id: "tls_cert_new_999" } };
      }
      throw new Error(`Unexpected call: ${path}`);
    });

    (plugin as any).getAccess = async () => mockAccess;
    (plugin as any).logger = { info: () => {}, error: () => {} };

    await plugin.execute();

    // Step 1: private key upload
    assert.equal(calls.length, 2);
    assert.equal(calls[0].path, "/tls/private_keys");
    assert.equal(calls[0].method, "post");
    assert.equal(calls[0].payload.data.type, "tls_private_key");
    assert.equal(calls[0].payload.data.attributes.key, mockCert.key);
    assert.equal(calls[0].payload.data.attributes.name, "my-cert");

    // Step 2: certificate upload with relationship
    assert.equal(calls[1].path, "/tls/certificates");
    assert.equal(calls[1].method, "post");
    assert.equal(calls[1].payload.data.type, "tls_certificate");
    assert.equal(calls[1].payload.data.attributes.cert_blob, mockCert.crt);
    assert.equal(calls[1].payload.data.relationships.tls_private_key.data.id, "pk_abc123");
    assert.equal(calls[1].payload.data.relationships.tls_private_key.data.type, "tls_private_key");

    assert.equal(plugin.fastlyCertId, "tls_cert_new_999");
  });

  it("should throw if private key upload returns no ID", async () => {
    const plugin = new FastlyUploadCertPlugin();
    plugin.cert = mockCert as any;
    plugin.accessId = "access-1";

    const mockAccess = fakeAccess(async () => ({ data: {} })); // no id returned

    (plugin as any).getAccess = async () => mockAccess;
    (plugin as any).logger = { info: () => {}, error: () => {} };

    await assert.rejects(() => plugin.execute(), /Fastly 私钥上传失败，未获取到 private key ID/);
  });

  it("reuses the existing private key when Fastly reports it already exists", async () => {
    const plugin = new FastlyUploadCertPlugin();
    plugin.cert = mockCert as any;
    plugin.accessId = "access-1";

    const calls: { path: string; payload: any; method: string }[] = [];

    const mockAccess = fakeAccess(async (path: string, payload: any, method: string) => {
      calls.push({ path, payload, method });
      if (path === "/tls/private_keys") {
        throw new Error('Fastly API 请求失败: {"errors":[{"title":"Can\'t create key","detail":"Key already exists: \'EO8Drv7EYjThQ4DUPo4Ot0\'"}]}');
      }
      if (path === "/tls/certificates") {
        return { data: { id: "tls_cert_new_1" } };
      }
      throw new Error(`Unexpected call: ${path}`);
    });

    (plugin as any).getAccess = async () => mockAccess;
    (plugin as any).logger = { info: () => {}, error: () => {} };

    await plugin.execute();

    assert.equal(calls.length, 2);
    assert.equal(calls[1].path, "/tls/certificates");
    assert.equal(calls[1].payload.data.relationships.tls_private_key.data.id, "EO8Drv7EYjThQ4DUPo4Ot0");
    assert.equal(plugin.fastlyCertId, "tls_cert_new_1");
  });

  it("reuses the existing certificate when Fastly reports it already exists", async () => {
    const plugin = new FastlyUploadCertPlugin();
    plugin.cert = mockCert as any;
    plugin.accessId = "access-1";

    const mockAccess = fakeAccess(async (path: string) => {
      if (path === "/tls/private_keys") {
        return { data: { id: "pk_1" } };
      }
      if (path === "/tls/certificates") {
        throw new Error('Fastly API 请求失败: {"errors":[{"title":"Can\'t create certificate","detail":"Certificate already exists: \'aBcDeFgHiJkLmNoPqRsTuV\'"}]}');
      }
      throw new Error(`Unexpected call: ${path}`);
    });

    (plugin as any).getAccess = async () => mockAccess;
    (plugin as any).logger = { info: () => {}, error: () => {} };

    await plugin.execute();

    assert.equal(plugin.fastlyCertId, "aBcDeFgHiJkLmNoPqRsTuV");
  });

  it("surfaces guidance when the certificate already exists without a recoverable id", async () => {
    const plugin = new FastlyUploadCertPlugin();
    plugin.cert = mockCert as any;
    plugin.accessId = "access-1";

    const mockAccess = fakeAccess(async (path: string) => {
      if (path === "/tls/private_keys") {
        return { data: { id: "pk_1" } };
      }
      if (path === "/tls/certificates") {
        throw new Error('Fastly API 请求失败: {"errors":[{"detail":"cert_blob is already in use"}]}');
      }
      throw new Error(`Unexpected call: ${path}`);
    });

    (plugin as any).getAccess = async () => mockAccess;
    (plugin as any).logger = { info: () => {}, error: () => {} };

    await assert.rejects(() => plugin.execute(), /填写该证书ID以走更新\(PATCH\)流程/);
  });
});

describe("FastlyUploadCertPlugin - update existing certificate (PATCH)", () => {
  it("should PATCH existing certificate with only cert_blob, no private key step", async () => {
    const plugin = new FastlyUploadCertPlugin();
    plugin.cert = mockCert as any;
    plugin.accessId = "access-1";
    plugin.certificateId = "tls_cert_existing_123";
    plugin.name = "updated-cert";

    const calls: { path: string; payload: any; method: string }[] = [];

    const mockAccess = fakeAccess(async (path: string, payload: any, method: string) => {
      calls.push({ path, payload, method });
      return { data: { id: "tls_cert_existing_123" } };
    });

    (plugin as any).getAccess = async () => mockAccess;
    (plugin as any).logger = { info: () => {}, error: () => {} };

    await plugin.execute();

    // Only 1 API call for update
    assert.equal(calls.length, 1);
    assert.equal(calls[0].path, "/tls/certificates/tls_cert_existing_123");
    assert.equal(calls[0].method, "patch");
    assert.equal(calls[0].payload.data.type, "tls_certificate");
    assert.equal(calls[0].payload.data.id, "tls_cert_existing_123");
    assert.equal(calls[0].payload.data.attributes.cert_blob, mockCert.crt);
    assert.equal(calls[0].payload.data.attributes.name, "updated-cert");
    // No relationships on PATCH
    assert.equal(calls[0].payload.data.relationships, undefined);

    assert.equal(plugin.fastlyCertId, "tls_cert_existing_123");
  });

  it("should fallback fastlyCertId to certificateId when response has no id", async () => {
    const plugin = new FastlyUploadCertPlugin();
    plugin.cert = mockCert as any;
    plugin.accessId = "access-1";
    plugin.certificateId = "tls_cert_fallback_id";

    const mockAccess = fakeAccess(async () => ({ data: {} })); // no id in response

    (plugin as any).getAccess = async () => mockAccess;
    (plugin as any).logger = { info: () => {}, error: () => {} };

    await plugin.execute();
    assert.equal(plugin.fastlyCertId, "tls_cert_fallback_id");
  });
});

describe("FastlyPurgeCachePlugin", () => {
  it("should call purge_all on the provided serviceId", async () => {
    const plugin = new FastlyPurgeCachePlugin();
    plugin.accessId = "access-1";
    plugin.serviceId = "svc_123";

    let capturedUrl = "";
    let capturedMethod = "";

    const mockAccess = {
      doRequestApi: async (path: string, payload: any, method: string) => {
        capturedUrl = path;
        capturedMethod = method;
        return { data: { status: "ok" } };
      },
    };

    (plugin as any).getAccess = async () => mockAccess;
    (plugin as any).logger = { info: () => {}, error: () => {} };

    await plugin.execute();

    assert.equal(capturedUrl, "/service/svc_123/purge_all");
    assert.equal(capturedMethod, "post");
  });
});

describe("FastlyDeployCertPlugin", () => {
  it("creates one tls_activation per domain when none exists yet", async () => {
    const plugin = new FastlyDeployCertPlugin();
    plugin.accessId = "access-1";
    plugin.cert = "cert_1";
    plugin.domainIds = ["*.g0l.net", "g0l.net"];
    plugin.configurationId = "cfg_1";

    const calls: { path: string; payload: any; method: string }[] = [];

    const mockAccess = fakeAccess(async (path: string, payload: any, method: string) => {
      calls.push({ path, payload, method });
      if (method === "get") {
        return { data: [] }; // no existing activation
      }
      return { data: { id: "act_new" } };
    });

    (plugin as any).getAccess = async () => mockAccess;
    (plugin as any).logger = { info: () => {}, error: () => {} };

    await plugin.execute();

    const posts = calls.filter(c => c.method === "post");
    assert.equal(posts.length, 2);
    assert.equal(posts[0].path, "/tls/activations");
    assert.equal(posts[0].payload.data.relationships.tls_certificate.data.id, "cert_1");
    assert.equal(posts[0].payload.data.relationships.tls_configuration.data.id, "cfg_1");
    assert.equal(posts[0].payload.data.relationships.tls_domain.data.id, "*.g0l.net");
    assert.equal(posts[1].payload.data.relationships.tls_domain.data.id, "g0l.net");
    // domain filter is url-encoded (wildcard -> %2A)
    assert.ok(calls[0].path.startsWith("/tls/activations?filter[tls_domain.id]=%2A.g0l.net"));
  });

  it("patches the existing activation onto the new cert (renewal)", async () => {
    const plugin = new FastlyDeployCertPlugin();
    plugin.accessId = "access-1";
    plugin.cert = "cert_new";
    plugin.domainIds = ["g0l.net"];
    plugin.configurationId = "cfg_1";

    const calls: { path: string; payload: any; method: string }[] = [];

    const mockAccess = fakeAccess(async (path: string, payload: any, method: string) => {
      calls.push({ path, payload, method });
      if (method === "get") {
        return { data: [{ id: "act_1", relationships: { tls_configuration: { data: { id: "cfg_1" } } } }] };
      }
      return { data: { id: "act_1" } };
    });

    (plugin as any).getAccess = async () => mockAccess;
    (plugin as any).logger = { info: () => {}, error: () => {} };

    await plugin.execute();

    const write = calls.find(c => c.method !== "get")!;
    assert.equal(write.method, "patch");
    assert.equal(write.path, "/tls/activations/act_1");
    assert.equal(write.payload.data.id, "act_1");
    assert.equal(write.payload.data.relationships.tls_certificate.data.id, "cert_new");
    assert.equal(write.payload.data.relationships.tls_configuration, undefined);
  });

  it("uploads a raw CertInfo to Fastly first, then binds the new cert id", async () => {
    const plugin = new FastlyDeployCertPlugin();
    plugin.accessId = "access-1";
    plugin.cert = mockCert as any;
    plugin.name = "my-cert";
    plugin.domainIds = ["dom_1"];
    plugin.configurationId = "cfg_1";

    const calls: { path: string; payload: any; method: string }[] = [];

    const mockAccess = fakeAccess(async (path: string, payload: any, method: string) => {
      calls.push({ path, payload, method });
      if (path === "/tls/private_keys") {
        return { data: { id: "pk_1" } };
      }
      if (path === "/tls/certificates") {
        return { data: { id: "tls_cert_uploaded_1" } };
      }
      if (method === "get") {
        return { data: [] };
      }
      return { data: { id: "act_new" } };
    });

    (plugin as any).getAccess = async () => mockAccess;
    (plugin as any).logger = { info: () => {}, error: () => {} };

    await plugin.execute();

    assert.equal(calls[0].path, "/tls/private_keys");
    assert.equal(calls[1].path, "/tls/certificates");
    assert.equal(calls[1].payload.data.attributes.cert_blob, mockCert.crt);
    const post = calls.find(c => c.path === "/tls/activations" && c.method === "post")!;
    assert.equal(post.payload.data.relationships.tls_certificate.data.id, "tls_cert_uploaded_1");
  });
});

describe("FastlyRefreshCertPlugin", () => {
  it("should update multiple certificates via PATCH", async () => {
    const plugin = new FastlyRefreshCertPlugin();
    plugin.cert = mockCert as any;
    plugin.accessId = "access-1";
    plugin.certList = ["cert_a", "cert_b"];

    const calls: { path: string; payload: any }[] = [];

    const mockAccess = {
      doRequestApi: async (path: string, payload: any, method: string) => {
        calls.push({ path, payload });
        return { data: { id: path.split("/").pop() } };
      },
    };

    (plugin as any).getAccess = async () => mockAccess;
    (plugin as any).logger = { info: () => {}, error: () => {} };

    await plugin.execute();

    assert.equal(calls.length, 2);
    assert.equal(calls[0].path, "/tls/certificates/cert_a");
    assert.equal(calls[0].payload.data.id, "cert_a");
    assert.equal(calls[0].payload.data.attributes.cert_blob, mockCert.crt);

    assert.equal(calls[1].path, "/tls/certificates/cert_b");
    assert.equal(calls[1].payload.data.id, "cert_b");
  });
});
