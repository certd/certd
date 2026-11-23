import assert from "node:assert/strict";
import { X509Certificate } from "node:crypto";
import { EVENT_CERT_APPLY_SUCCESS } from "@certd/plugin-cert";
import { createRootCa } from "../../../../modules/cert/service/local-ca-crypto.js";
import { CertApplyPlugin } from "./apply.js";

function createPlugin(directoryUrl?: string) {
  const plugin: any = new CertApplyPlugin();
  const events: any[] = [];
  plugin.acmeProvider = directoryUrl ? { directoryUrl } : undefined;
  plugin.ctx = {
    emitter: {
      async emit(event: string, value: any) {
        events.push({ event, value });
      },
    },
    pipeline: { id: 1 },
    step: { id: "apply" },
  };
  plugin.pfxPassword = "";
  return { plugin, events };
}

describe("CertApplyPlugin local CA event", () => {
  it("内置本地ACME签发后事件携带 localCaId 与 serialNumber", async () => {
    const ca = await createRootCa({ subject: { CN: "Event Root" }, keyType: "rsa2048", validityYears: 2 });
    const { plugin, events } = createPlugin("https://certd.example.com/api/acme/12/directory");
    plugin.cert = { crt: ca.certPem };

    await plugin.emitCertApplySuccess();

    assert.equal(events.length, 1);
    assert.equal(events[0].event, EVENT_CERT_APPLY_SUCCESS);
    assert.equal(events[0].value.localCaId, 12);
    assert.equal(events[0].value.serialNumber, new X509Certificate(ca.certPem).serialNumber.toUpperCase());
  });

  it("非本地CA的目录地址不添加本地CA字段", async () => {
    const ca = await createRootCa({ subject: { CN: "Public Root" }, keyType: "rsa2048", validityYears: 2 });
    const { plugin, events } = createPlugin("https://acme-v02.api.letsencrypt.org/directory");
    plugin.cert = { crt: ca.certPem };

    await plugin.emitCertApplySuccess();

    assert.equal(events.length, 1);
    assert.equal(events[0].value.localCaId, undefined);
    assert.equal(events[0].value.serialNumber, undefined);
  });
});
