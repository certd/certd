import assert from "node:assert/strict";
import { CertConverter } from "./convert.js";

describe("CertConverter", () => {
  it("rejects unsupported PFX options before reading the certificate", async () => {
    const converter = new CertConverter({ logger: { info() {}, warn() {}, error() {} } as any });

    await assert.rejects(converter.convert({ cert: {} as any, pfxPassword: "", pfxArgs: "; echo injected" }), /不支持的PFX转换参数/);
  });
});
