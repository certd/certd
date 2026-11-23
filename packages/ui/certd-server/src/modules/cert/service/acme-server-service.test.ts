import assert from "node:assert/strict";
import { AcmeServerService } from "./acme-server-service.js";

describe("AcmeServerService finalize authorization", () => {
  it("EAB 禁用后已有订单不能 finalize", async () => {
    const service: any = new AcmeServerService();
    service.localCaService = { getAcmeEabProfile: async () => null };
    const account: any = { eabId: "eab-1" };
    const order: any = { identifiers: JSON.stringify([{ type: "dns", value: "old.example.com" }]) };
    await assert.rejects(() => service.assertOrderStillAuthorized({ allowedDomains: null }, account, order), /EAB凭证已禁用或过期/);
  });

  it("EAB 域名范围收紧后已有订单不能 finalize", async () => {
    const service: any = new AcmeServerService();
    service.localCaService = {
      async getAcmeEabProfile() {
        return { id: "eab-1", allowedDomains: ["new.example.com"] };
      },
    };
    const account: any = { eabId: "eab-1" };
    const order: any = { identifiers: JSON.stringify([{ type: "dns", value: "old.example.com" }]) };
    await assert.rejects(() => service.assertOrderStillAuthorized({ allowedDomains: null }, account, order), /不在该CA允许签发的范围内/);
  });
});
