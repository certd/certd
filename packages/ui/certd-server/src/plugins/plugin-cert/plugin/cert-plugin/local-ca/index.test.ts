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

function setProviderService(plugin: any, providers: any[]) {
  const orig = plugin.ctx.serviceGetter.get.bind(plugin.ctx.serviceGetter);
  plugin.ctx.serviceGetter.get = async (name: string) => {
    if (name === "customAcmeProviderService") {
      return {
        getAll: async () => providers,
        getBySslProvider: async (sslProvider: string) => providers.find(item => item.sslProvider === sslProvider),
      };
    }
    return orig(name);
  };
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
  it("本地ACME模式账号绑定特权EAB时跳过域名验证计划", async () => {
    const leaf = await createLeaf();
    const { plugin } = createPlugin(leaf, { inputChanged: true } as any);
    plugin.mode = "local-acme";
    plugin.acmeAccountAccessId = 1;
    (plugin as any).localCa = undefined;
    (plugin as any).isDirectIssueMode = async () => true;

    const plan = await (plugin as any).createDomainsVerifyPlanByAuto(["plugin.example.com"], null);
    assert.deepEqual(plan, {});
    assert.equal((plugin as any).requiresAcmeAccount(), true);
    assert.equal(await (plugin as any).getResolvedDirectoryUrl(), "https://certd.example.com/api/acme/1/directory");
  });

  it("本地ACME模式未开启直签时继续走域名验证计划", async () => {
    const leaf = await createLeaf();
    const { plugin } = createPlugin(leaf, { inputChanged: true } as any);
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

  it("存量remote-acme任务运行时给出明确迁移引导报错", async () => {
    const leaf = await createLeaf();
    const { plugin } = createPlugin(leaf, { inputChanged: true } as any);
    (plugin as any).mode = "remote-acme";
    await assert.rejects(() => plugin.onInit(), /远程ACME模式已移除/);
  });

  it("本地ACME由所选颁发机构localCaId推导caId，覆盖旧caId避免冲突", async () => {
    const leaf = await createLeaf();
    const { plugin } = createPlugin(leaf, { inputChanged: true } as any);
    plugin.mode = "local-acme";
    plugin.caId = 1;
    (plugin as any).sslProvider = "local-ca-2";
    setProviderService(plugin, [{ sslProvider: "local-ca-2", localCaId: 2, directoryUrl: "https://certd.example.com/api/acme/2/directory" }]);
    await (plugin as any).ensureLocalAcmeCaId();
    assert.equal(plugin.caId, 2);
  });

  it("颁发机构无localCaId标记时从Directory URL解析caId", async () => {
    const leaf = await createLeaf();
    const { plugin } = createPlugin(leaf, { inputChanged: true } as any);
    plugin.mode = "local-acme";
    plugin.caId = 0;
    (plugin as any).sslProvider = "local-ca-7";
    setProviderService(plugin, [{ sslProvider: "local-ca-7", directoryUrl: "https://certd.example.com/api/acme/7/directory" }]);
    await (plugin as any).ensureLocalAcmeCaId();
    assert.equal(plugin.caId, 7);
  });

  it("legacy任务未选颁发机构时从账号Directory URL推导caId", async () => {
    const leaf = await createLeaf();
    const { plugin } = createPlugin(leaf, { inputChanged: true } as any);
    plugin.mode = "local-acme";
    plugin.caId = 0;
    plugin.acmeAccountAccessId = 1;
    (plugin as any).getAccess = async () => ({ account: JSON.stringify({ directoryUrl: "https://certd.example.com/api/acme/3/directory", accountKey: "k", accountUri: "https://certd.example.com/api/acme/3/account/1" }) });
    await (plugin as any).ensureLocalAcmeCaId();
    assert.equal(plugin.caId, 3);
  });

  it("颁发机构下拉仅列已同步、启用且有权使用的中间CA，并带标记", async () => {
    const leaf = await createLeaf();
    const { plugin } = createPlugin(leaf, { inputChanged: true } as any);
    setProviderService(plugin, [
      { sslProvider: "local-ca-1", localCaId: 1, title: "北京分公司中间CA G2", enabled: true },
      { sslProvider: "local-ca-2", localCaId: 2, title: "停用CA", enabled: false },
      { sslProvider: "extca", title: "外部CA" },
      { sslProvider: "local-ca-3", localCaId: 3, title: "无权CA" },
    ]);
    const orig = plugin.ctx.serviceGetter.get.bind(plugin.ctx.serviceGetter);
    plugin.ctx.serviceGetter.get = async (name: string) => {
      if (name === "localCaGetter") {
        return { listOptions: async () => [{ id: 1 }, { id: 2 }] };
      }
      return orig(name);
    };
    const options = await plugin.onSslProviderList();
    assert.deepEqual(options, [{ value: "local-ca-1", label: "北京分公司中间CA G2 【local-ca-1】【中间CA】" }]);
  });

  it("本地ACME表单加载选项时未选CA不阻断onInit", async () => {
    const leaf = await createLeaf();
    const { plugin } = createPlugin(leaf, { inputChanged: true } as any);
    plugin.mode = "local-acme";
    plugin.caId = undefined as any;
    plugin.sslProvider = undefined as any;
    setProviderService(plugin, []);
    await plugin.onInit();
  });

  it("表单选项请求（无pipeline上下文）不校验所选CA可用性", async () => {
    const leaf = await createLeaf();
    const { plugin } = createPlugin(leaf, { inputChanged: true } as any);
    plugin.mode = "local-acme";
    plugin.caId = 999;
    plugin.sslProvider = undefined as any;
    plugin.ctx.pipeline = undefined;
    setProviderService(plugin, []);
    await plugin.onInit();
  });

  it("即使旧证书未到期，直接签发模式也会先拒绝已禁用的CA", async () => {
    const leaf = await createLeaf();
    const old = new CertReader({ crt: leaf.crt, key: leaf.key });
    const { plugin } = createPlugin(leaf, { caDisabled: true, old, inputChanged: false });
    delete (plugin as any).condition;
    await assert.rejects(() => plugin.condition(), /本地CA已禁用/);
  });

  it("缺少有效账户凭证时不判定为直签", async () => {
    const leaf = await createLeaf();
    const { plugin } = createPlugin(leaf, { inputChanged: true } as any);
    plugin.mode = "local-acme";
    plugin.acmeAccountAccessId = 1;
    assert.equal(await (plugin as any).isDirectIssueMode({ id: 1 }), false);
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

describe("CertApplyLocalCa 仅本地ACME凭证", () => {
  it("仅本地档ACME请求携带内部凭证头", async () => {
    const { CertApplyLocalCa } = await import("./index.js");
    const plugin: any = new CertApplyLocalCa();
    plugin.mode = "local-acme";
    plugin.localCa = { id: 1, localAcmeToken: "tok-123" };
    plugin.resolvedDirectoryUrl = "https://certd.example.com/api/acme/1/directory";
    const provider = await plugin.getAcmeProvider();
    assert.deepEqual(provider.extraHeaders, { "x-certd-acme-token": "tok-123" });
  });

  it("标准档不携带内部凭证头", async () => {
    const { CertApplyLocalCa } = await import("./index.js");
    const plugin: any = new CertApplyLocalCa();
    plugin.mode = "local-acme";
    plugin.localCa = { id: 1 };
    plugin.resolvedDirectoryUrl = "https://certd.example.com/api/acme/1/directory";
    const provider = await plugin.getAcmeProvider();
    assert.equal(provider.extraHeaders, undefined);
  });
});
