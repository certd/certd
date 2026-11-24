import assert from "node:assert/strict";
import { CertReader } from "@certd/plugin-lib";
import { CertApplyLocalCa } from "./index.js";
import { createRootCa, issueLeafCertificate } from "../../../../../modules/local-ca/service/local-ca-crypto.js";

async function createLeaf() {
  const ca = await createRootCa({
    subject: { CN: "Plugin Test Root CA" },
    keyType: "rsa2048",
    validityYears: 1,
  });
  const leaf = await issueLeafCertificate({
    caCertPem: ca.certPem,
    caPrivateKeyPem: ca.privateKeyPem,
    domains: ["plugin.example.com"],
    keyType: "rsa2048",
    validityDays: 30,
  });
  return leaf;
}

function createPlugin(leaf: any, opts: { caDisabled?: boolean; caType?: string; old?: any; inputChanged?: boolean; allowedDomains?: string[] } = {}) {
  const plugin = new CertApplyLocalCa();
  plugin.caId = 1;
  plugin.domains = ["plugin.example.com"];
  plugin.keyType = "rsa2048";
  plugin.validityDays = 30;
  plugin.renewDays = 20;

  const calls = {
    output: null as any,
    emit: null as any,
    issue: null as any,
  };
  const getter = {
    async getCa() {
      return {
        id: 1,
        caType: opts.caType || "intermediate",
        disabled: opts.caDisabled === true,
        allowedDomains: opts.allowedDomains ? JSON.stringify(opts.allowedDomains) : null,
        acmeEnabled: true,
        acmeDirectIssue: (opts as any).acmeDirectIssue === true,
        effectiveBaseUrl: "https://certd.example.com",
      };
    },
    async issueLeaf(req: any) {
      calls.issue = req;
      return leaf;
    },
  };

  plugin.ctx = {
    inputChanged: opts.inputChanged === true,
    user: { role: "admin" },
    serviceGetter: {
      async get(name: string) {
        if (name === "domainVerifierGetter") {
          return {
            async getVerifiers() {
              return {};
            },
          };
        }
        return getter;
      },
    },
    emitter: {
      async emit(_event: string, value: any) {
        calls.emit = value;
      },
    },
    pipeline: { id: 1 },
    step: { id: 2 },
  } as any;
  (plugin as any).logger = { info() {}, warn() {}, error() {}, addSecret() {} };
  plugin.condition = async () => opts.old ?? null;
  plugin.readLastCert = async () => opts.old;
  plugin.output = async (reader: any, isNew: boolean) => {
    plugin.cert = reader.toCertInfo();
    calls.output = { isNew, cert: plugin.cert };
  };
  plugin.registerSecret = () => {};
  plugin.clearLastStatus = () => {};
  plugin.checkSignal = () => {};

  return { plugin, calls };
}

describe("CertApplyLocalCa", () => {
  it("首次签发时 output 后携带 localCaId/serial 发事件", async () => {
    const leaf = await createLeaf();
    const { plugin, calls } = createPlugin(leaf, { inputChanged: true });

    await plugin.execute();

    assert.equal(calls.output.isNew, true);
    assert.equal(calls.issue.caId, 1);
    assert.equal(calls.issue.domains[0], "plugin.example.com");
    assert.equal(calls.emit.extensions.issuer.type, "local-ca");
    assert.equal(calls.emit.extensions.issuer.id, "1");
    assert.equal(calls.emit.extensions.issuer.serialNumber, leaf.serialNumber);
  });

  it("证书未到期且输入未变化时跳过，并保留旧输出", async () => {
    const leaf = await createLeaf();
    const old = new CertReader({ crt: leaf.crt, key: leaf.key });
    const { plugin, calls } = createPlugin(leaf, { old, inputChanged: false });

    const ret = await plugin.execute();

    assert.equal(ret, "skip");
    assert.equal(calls.issue, null);
    assert.equal(calls.emit, null);
    assert.equal(calls.output.isNew, false);
    assert.ok(calls.output.cert.crt);
  });

  it("混合域名时只签发CA允许的域名", async () => {
    const leaf = await createLeaf();
    const { plugin, calls } = createPlugin(leaf, { inputChanged: true, allowedDomains: ["example.com"] });
    plugin.domains = ["foo.example.com", "evil.example.net"];
    await plugin.execute();
    assert.deepEqual(calls.issue.domains, ["foo.example.com"]);
  });

  it("CA禁用时拒绝执行", async () => {
    const leaf = await createLeaf();
    const { plugin } = createPlugin(leaf, { caDisabled: true, inputChanged: true });
    await assert.rejects(() => plugin.execute(), /本地CA已禁用/);
  });
  it("本地ACME模式在CA开启EAB直签时跳过域名验证计划", async () => {
    const leaf = await createLeaf();
    const { plugin } = createPlugin(leaf, { inputChanged: true, acmeDirectIssue: true } as any);
    plugin.mode = "local-acme";
    plugin.acmeAccountAccessId = 1;
    (plugin as any).localCa = undefined;

    const plan = await (plugin as any).createDomainsVerifyPlanByAuto(["plugin.example.com"], null);
    assert.deepEqual(plan, {});
    assert.equal((plugin as any).requiresAcmeAccount(), true);
    assert.equal(await (plugin as any).getResolvedDirectoryUrl(), "https://certd.example.com/api/acme/1/directory");
  });

  it("本地ACME模式未开启直签时继续走域名验证计划", async () => {
    const leaf = await createLeaf();
    const { plugin } = createPlugin(leaf, { inputChanged: true, acmeDirectIssue: false } as any);
    plugin.mode = "local-acme";
    plugin.acmeAccountAccessId = 1;
    (plugin as any).localCa = undefined;
    let called = false;
    (plugin as any).isDirectIssueMode = async () => false;
    (plugin as any).createDomainsVerifyPlan = async () => {
      called = true;
      return { "plugin.example.com": { type: "http" } };
    };
    // 父类自动匹配会进入域名校验并因缺少配置而报错，这里只验证没有直接跳过
    await assert.rejects(() => (plugin as any).createDomainsVerifyPlanByAuto(["plugin.example.com"], null), /没有找到|校验方式/);
    assert.equal(called, false);
  });

  it("远程ACME目录声明EAB直签时自动匹配返回空计划", async () => {
    const leaf = await createLeaf();
    const { plugin } = createPlugin(leaf, { inputChanged: true } as any);
    plugin.mode = "remote-acme";
    plugin.directoryUrl = "https://remote.example.com/api/acme/9/directory";
    plugin.acmeAccountAccessId = 1;
    const originalFetch = (globalThis as any).fetch;
    (globalThis as any).fetch = async () => ({
      ok: true,
      async json() {
        return { meta: { certdLocalCa: { caId: 9, directIssue: true, eabRequired: true } } };
      },
    });
    try {
      const plan = await (plugin as any).createDomainsVerifyPlanByAuto(["remote.example.com"], null);
      assert.deepEqual(plan, {});
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });

  it("即使旧证书未到期，直接签发模式也会先拒绝已禁用的CA", async () => {
    const leaf = await createLeaf();
    const old = new CertReader({ crt: leaf.crt, key: leaf.key });
    const { plugin } = createPlugin(leaf, { caDisabled: true, old, inputChanged: false });
    delete (plugin as any).condition;
    await assert.rejects(() => plugin.condition(), /本地CA已禁用/);
  });

  it("普通用户不能把远程ACME指向本机/链路本地地址", async () => {
    const leaf = await createLeaf();
    const { plugin } = createPlugin(leaf, { inputChanged: true } as any);
    plugin.mode = "remote-acme";
    plugin.directoryUrl = "http://127.0.0.1:7001/api/acme/9/directory";
    (plugin.ctx.user as any).role = "user";
    await assert.rejects(() => (plugin as any).getResolvedDirectoryUrl(), /本机\/私网\/链路本地/);
  });

  it("真实续期判断不会因域名过滤而每次重签", async () => {
    const leaf = await createLeaf();
    const old = new CertReader({ crt: leaf.crt, key: leaf.key });
    const { plugin } = createPlugin(leaf, { old, inputChanged: false, allowedDomains: ["example.com"] } as any);
    delete (plugin as any).condition;
    plugin.domains = ["plugin.example.com", "evil.example.net"];
    const keys = (plugin as any).getCheckChangeInputKeys();
    const input: any = {};
    for (const key of keys) {
      if ((plugin as any)[key] !== undefined) {
        input[key] = (plugin as any)[key];
      }
    }
    plugin.lastStatus = { input } as any;
    const ret = await plugin.condition();
    assert.equal(ret, old);
  });

  it("ACME模式真实续期判断不会被内部账号命名空间影响", async () => {
    const leaf = await createLeaf();
    const old = new CertReader({ crt: leaf.crt, key: leaf.key });
    const { plugin } = createPlugin(leaf, { old, inputChanged: false } as any);
    delete (plugin as any).condition;
    plugin.mode = "local-acme";
    plugin.acmeAccountAccessId = 1;
    plugin.sslProvider = "custom" as any;
    (plugin as any).localCa = undefined;
    await plugin.onInit();
    const keys = (plugin as any).getCheckChangeInputKeys();
    const input: any = {};
    for (const key of keys) {
      if ((plugin as any)[key] !== undefined) {
        input[key] = (plugin as any)[key];
      }
    }
    plugin.lastStatus = { input } as any;
    const ret = await plugin.condition();
    assert.equal(ret, old);
    assert.equal(plugin.sslProvider, "custom");
  });
});
