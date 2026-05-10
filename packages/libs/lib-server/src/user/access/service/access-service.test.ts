import assert from "assert";
import { AccessService } from "./access-service.js";

describe("AccessService", () => {
  it("does not write id into access setting when updating selected fields", async () => {
    let updateParam: any;
    const service = new AccessService();
    service.info = async () => ({
      id: 12,
      type: "eab",
    } as any);
    service.decryptAccessEntity = () => ({
      kid: "kid-1",
    });
    service.update = async (param: any) => {
      updateParam = param;
      return param;
    };

    await service.updateAccess({
      id: 12,
      accountKey: "account-key",
    });

    assert.deepEqual(JSON.parse(updateParam.setting), {
      kid: "kid-1",
      accountKey: "account-key",
    });
  });
});
