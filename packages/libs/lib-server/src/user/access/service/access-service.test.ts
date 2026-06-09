import assert from "assert";
import esmock from "esmock";
import { AccessService } from "./access-service.js";

describe("AccessService", () => {
  it("does not write id into access setting when updating selected fields", async () => {
    let updateParam: any;
    const service = new AccessService();
    service.info = async () =>
      ({
        id: 12,
        type: "eab",
      }) as any;
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

  it("writes subtype from access define field", async () => {
    const { AccessService: MockedAccessService } = await esmock("./access-service.js", {
      "@certd/pipeline": {
        accessRegistry: {
          getDefine(type: string) {
            assert.equal(type, "acmeAccount");
            return {
              name: "acmeAccount",
              subtype: "caType",
              input: {
                caType: {},
                account: {
                  encrypt: true,
                },
              },
            };
          },
        },
      },
    });
    const service = new MockedAccessService();
    service.encryptService = {
      encrypt(value: string) {
        return `encrypted:${value}`;
      },
    };
    const param: any = {
      type: "acmeAccount",
      setting: JSON.stringify({
        caType: "letsencrypt",
        account: JSON.stringify({
          accountKey: "key",
          accountUri: "https://example.com/acct/1",
          caType: "letsencrypt",
        }),
      }),
    };

    service.encryptSetting(param);

    assert.equal(param.subtype, "letsencrypt");
  });

  it("allows acme account access to be saved before account generation", async () => {
    const { AccessService: MockedAccessService } = await esmock("./access-service.js", {
      "@certd/pipeline": {
        accessRegistry: {
          getDefine() {
            return {
              name: "acmeAccount",
              subtype: "caType",
              input: {
                caType: {},
                account: {
                  encrypt: true,
                },
              },
            };
          },
        },
      },
    });
    const service = new MockedAccessService();
    const param: any = {
      type: "acmeAccount",
      setting: JSON.stringify({
        caType: "letsencrypt",
      }),
    };

    service.encryptSetting(param);

    assert.equal(param.subtype, "letsencrypt");
    assert.deepEqual(JSON.parse(param.setting), {
      caType: "letsencrypt",
    });
  });
});
