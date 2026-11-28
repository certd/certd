import assert from "node:assert/strict";
import { X509Certificate } from "node:crypto";
import { createCsr, createRootCa, signCsr } from "../../../../modules/local-ca/service/local-ca-crypto.js";
import { CertApplyPlugin } from "./apply.js";
import { CertApplyLocalCa } from "./local-ca/index.js";

function mockCtx(events: any[], ca?: any) {
  return {
    emitter: {
      async emit(event: string, value: any) {
        events.push({ event, value });
      },
    },
    serviceGetter: {
      async get() {
        return {
          async getCa() {
            return ca || null;
          },
        };
      },
    },
    pipeline: { id: 1 },
    step: { id: "apply" },
    user: { role: "admin" },
  };
}

describe("证书签发来源事件", () => {
  it("通用CertApplyPlugin不再感知Local CA，不附加issuer", async () => {
    const events: any[] = [];
    const plugin: any = new CertApplyPlugin();
    plugin.ctx = mockCtx(events);
    plugin.pfxPassword = "";
    plugin.cert = { crt: "dummy" };
    plugin.logger = { info() {}, warn() {}, error() {}, debug() {} };
    await plugin.emitCertApplySuccess();
    assert.equal(events.length, 1);
    assert.equal(events[0].value.extensions, undefined);
  });

  it("CertApplyLocalCa本地ACME明确附加issuer扩展", async () => {
    const ca = await createRootCa({ subject: { CN: "Event Root" }, keyType: "rsa2048", validityYears: 2 });
    const { csrPem } = await createCsr({ domains: ["event.example.com"], keyType: "rsa2048" });
    const signed = await signCsr({ caCertPem: ca.certPem, caPrivateKeyPem: ca.privateKeyPem, csrPem, validityDays: 30 });
    const events: any[] = [];
    const plugin: any = new CertApplyLocalCa();
    plugin.mode = "local-acme";
    plugin.caId = 12;
    plugin.ctx = mockCtx(events, { id: 12, caType: "intermediate", acmeEnabled: true, disabled: false, revoked: false, certPem: ca.certPem, allowedDomains: null, notAfter: Date.now() + 86400000 });
    plugin.pfxPassword = "";
    plugin.cert = { crt: signed.certPem };
    plugin.logger = { info() {}, warn() {}, error() {}, debug() {} };
    await plugin.emitCertApplySuccess();
    assert.equal(events[0].value.extensions.issuer.type, "local-ca");
    assert.equal(events[0].value.extensions.issuer.id, "12");
    assert.equal(events[0].value.extensions.issuer.serialNumber, new X509Certificate(signed.certPem).serialNumber.toUpperCase());
  });

  it("本地ACME证书与CA不匹配时拒绝写入（fail-closed）", async () => {
    const ca = await createRootCa({ subject: { CN: "Expected" }, keyType: "rsa2048", validityYears: 2 });
    const other = await createRootCa({ subject: { CN: "Other" }, keyType: "rsa2048", validityYears: 2 });
    const events: any[] = [];
    const plugin: any = new CertApplyLocalCa();
    plugin.mode = "local-acme";
    plugin.caId = 12;
    plugin.ctx = mockCtx(events, { id: 12, caType: "intermediate", acmeEnabled: true, disabled: false, revoked: false, certPem: ca.certPem, allowedDomains: null, notAfter: Date.now() + 86400000 });
    plugin.pfxPassword = "";
    plugin.cert = { crt: other.certPem };
    plugin.logger = { info() {}, warn() {}, error() {}, debug() {} };
    await assert.rejects(() => plugin.emitCertApplySuccess(), /不匹配/);
    assert.equal(events.length, 0);
  });
});
