import assert from "node:assert/strict";
import { X509Certificate } from "node:crypto";
import { EVENT_CERT_APPLY_SUCCESS } from "@certd/plugin-cert";
import { createCsr, createRootCa, signCsr } from "../../../../modules/cert/service/local-ca-crypto.js";
import { CertApplyPlugin } from "./apply.js";

function createPlugin(directoryUrl?: string, caCertPem?: string) {
  const plugin: any = new CertApplyPlugin();
  const events: any[] = [];
  plugin.acmeProvider = directoryUrl ? { directoryUrl } : undefined;
  plugin.ctx = {
    emitter: {
      async emit(event: string, value: any) {
        events.push({ event, value });
      },
    },
    serviceGetter: {
      async get() {
        return { async getCa() { return caCertPem ? { certPem: caCertPem } : null; } };
      },
    },
    pipeline: { id: 1 },
    step: { id: "apply" },
  };
  plugin.pfxPassword = "";
  plugin.logger = { info() {}, warn() {}, error() {}, debug() {} };
  return { plugin, events };
}

describe("CertApplyPlugin local CA event", () => {
  it("内置本地ACME签发后事件携带 localCaId 与 serialNumber", async () => {
    const ca = await createRootCa({ subject: { CN: "Event Root" }, keyType: "rsa2048", validityYears: 2 });
    const { csrPem } = await createCsr({ domains: ["event.example.com"], keyType: "rsa2048" });
    const signed = await signCsr({ caCertPem: ca.certPem, caPrivateKeyPem: ca.privateKeyPem, csrPem, validityDays: 30 });
    const { plugin, events } = createPlugin("https://certd.example.com/api/acme/12/directory", ca.certPem);
    plugin.cert = { crt: signed.certPem };

    await plugin.emitCertApplySuccess();

    assert.equal(events.length, 1);
    assert.equal(events[0].event, EVENT_CERT_APPLY_SUCCESS);
    assert.equal(events[0].value.localCaId, 12);
    assert.equal(events[0].value.serialNumber, new X509Certificate(signed.certPem).serialNumber.toUpperCase());
  });

  it("非本地CA的目录地址不添加本地CA字段", async () => {
    const ca = await createRootCa({ subject: { CN: "Public Root" }, keyType: "rsa2048", validityYears: 2 });
    const { plugin, events } = createPlugin("https://acme-v02.api.letsencrypt.org/directory", ca.certPem);
    plugin.cert = { crt: ca.certPem };

    await plugin.emitCertApplySuccess();

    assert.equal(events.length, 1);
    assert.equal(events[0].value.localCaId, undefined);
    assert.equal(events[0].value.serialNumber, undefined);
  });

  it("证书并非该CA签发时不关联本地CA", async () => {
    const ca = await createRootCa({ subject: { CN: "Expected CA" }, keyType: "rsa2048", validityYears: 2 });
    const other = await createRootCa({ subject: { CN: "Other CA" }, keyType: "rsa2048", validityYears: 2 });
    const { plugin, events } = createPlugin("https://certd.example.com/api/acme/12/directory", ca.certPem);
    plugin.cert = { crt: other.certPem };

    await plugin.emitCertApplySuccess();

    assert.equal(events.length, 1);
    assert.equal(events[0].value.localCaId, undefined);
  });
});
