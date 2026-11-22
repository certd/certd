import assert from "node:assert/strict";
import { CertReader } from "@certd/plugin-lib";
import { CertApplyLocalCa } from "./index.js";
import { createRootCa, issueLeafCertificate } from "../../../../../modules/cert/service/local-ca-crypto.js";

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

function createPlugin(leaf: any, opts: { caDisabled?: boolean; caType?: string; old?: any; inputChanged?: boolean } = {}) {
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
      return { id: 1, caType: opts.caType || "intermediate", disabled: opts.caDisabled === true };
    },
    async issueLeaf(req: any) {
      calls.issue = req;
      return leaf;
    },
  };

  plugin.ctx = {
    inputChanged: opts.inputChanged === true,
    serviceGetter: {
      async get() {
        return getter;
      },
    },
  } as any;
  (plugin as any).logger = { info() {}, warn() {}, error() {} };
  plugin.readLastCert = async () => opts.old;
  plugin.output = async (reader: any, isNew: boolean) => {
    calls.output = { isNew, cert: reader.toCertInfo() };
  };
  plugin.emitCertApplySuccess = async (extra: any) => {
    calls.emit = extra;
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
    assert.equal(calls.emit.localCaId, 1);
    assert.equal(calls.emit.serialNumber, leaf.serialNumber);
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

  it("CA禁用时拒绝执行", async () => {
    const leaf = await createLeaf();
    const { plugin } = createPlugin(leaf, { caDisabled: true, inputChanged: true });
    await assert.rejects(() => plugin.execute(), /本地CA已禁用/);
  });
});
