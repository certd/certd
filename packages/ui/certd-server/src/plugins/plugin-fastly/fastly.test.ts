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
});

describe("FastlyUploadCertPlugin - new certificate (2-step flow)", () => {
  it("should upload private key first then create certificate with relationship", async () => {
    const plugin = new FastlyUploadCertPlugin();
    plugin.cert = mockCert as any;
    plugin.accessId = "access-1";
    plugin.name = "my-cert";

    const calls: { path: string; payload: any; method: string }[] = [];

    const mockAccess = {
      doRequestApi: async (path: string, payload: any, method: string) => {
        calls.push({ path, payload, method });
        if (path === "/tls/private_keys") {
          return { data: { id: "pk_abc123" } };
        }
        if (path === "/tls/certificates") {
          return { data: { id: "tls_cert_new_999" } };
        }
        throw new Error(`Unexpected call: ${path}`);
      },
    };

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

    const mockAccess = {
      doRequestApi: async () => ({ data: {} }), // no id returned
    };

    (plugin as any).getAccess = async () => mockAccess;
    (plugin as any).logger = { info: () => {}, error: () => {} };

    await assert.rejects(
      () => plugin.execute(),
      /Fastly 私钥上传失败，未获取到 private key ID/
    );
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

    const mockAccess = {
      doRequestApi: async (path: string, payload: any, method: string) => {
        calls.push({ path, payload, method });
        return { data: { id: "tls_cert_existing_123" } };
      },
    };

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

    const mockAccess = {
      doRequestApi: async () => ({ data: {} }), // no id in response
    };

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
      }
    };
    
    (plugin as any).getAccess = async () => mockAccess;
    (plugin as any).logger = { info: () => {}, error: () => {} };

    await plugin.execute();

    assert.equal(capturedUrl, "/service/svc_123/purge_all");
    assert.equal(capturedMethod, "post");
  });
});

describe("FastlyDeployCertPlugin", () => {
  it("should create tls_activation with correct relationships", async () => {
    const plugin = new FastlyDeployCertPlugin();
    plugin.accessId = "access-1";
    plugin.certificateId = "cert_1";
    plugin.domainId = "dom_1";
    plugin.configurationId = "cfg_1";

    let capturedPayload: any = null;
    let capturedUrl = "";
    
    const mockAccess = {
      doRequestApi: async (path: string, payload: any, method: string) => {
        capturedUrl = path;
        capturedPayload = payload;
        return { data: { id: "act_123" } };
      }
    };
    
    (plugin as any).getAccess = async () => mockAccess;
    (plugin as any).logger = { info: () => {}, error: () => {} };

    await plugin.execute();

    assert.equal(capturedUrl, "/tls/activations");
    assert.equal(capturedPayload.data.type, "tls_activation");
    assert.equal(capturedPayload.data.relationships.tls_certificate.data.id, "cert_1");
    assert.equal(capturedPayload.data.relationships.tls_configuration.data.id, "cfg_1");
    assert.equal(capturedPayload.data.relationships.tls_domain.data.id, "dom_1");
  });
});

describe("FastlyRefreshCertPlugin", () => {
  it("should update multiple certificates via PATCH", async () => {
    const plugin = new FastlyRefreshCertPlugin();
    plugin.cert = mockCert as any;
    plugin.accessId = "access-1";
    plugin.certList = ["cert_a", "cert_b"];

    const calls: { path: string, payload: any }[] = [];
    
    const mockAccess = {
      doRequestApi: async (path: string, payload: any, method: string) => {
        calls.push({ path, payload });
        return { data: { id: path.split('/').pop() } };
      }
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
