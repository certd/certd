import assert from "assert";
import esmock from "esmock";
import { buildEabAccountKeyValue, buildLegacyGoogleAccountConfigWhere, GoogleCommonEabAccountKeyFix, parseStorageValue } from "./google-common-eab-account-key-fix.js";

describe("GoogleCommonEabAccountKeyFix", () => {
  it("parses legacy storage values", () => {
    const config = parseStorageValue(
      JSON.stringify({
        value: {
          key: "legacy-private-key",
          accountUrl: "https://example.com/acct/1",
        },
      })
    );

    assert.equal(config.key, "legacy-private-key");
  });

  it("builds the EAB account key payload", () => {
    const payload = JSON.parse(buildEabAccountKeyValue("kid-1", "private-key"));

    assert.deepEqual(payload, {
      kid: "kid-1",
      privateKey: "private-key",
    });
  });

  it("builds legacy Google account config query by exact email key only", () => {
    assert.deepEqual(buildLegacyGoogleAccountConfigWhere("user@example.com"), {
      userId: 1,
      scope: "user",
      namespace: "1",
      key: "acme.config.google.user@example.com",
    });
  });

  it("finds legacy Google account config by exact email key only", async () => {
    let findOneWhere: any;
    let findCalled = false;
    const fix = new GoogleCommonEabAccountKeyFix();
    fix.storageService = {
      getRepository() {
        return {
          async findOne(options: any) {
            findOneWhere = options.where;
            return {
              value: JSON.stringify({
                value: {
                  privateKey: "legacy-private-key",
                },
              }),
            };
          },
          async find() {
            findCalled = true;
            return [];
          },
        };
      },
    } as any;

    const config = await fix.getLegacyGoogleAccountConfig("user@example.com");

    assert.equal(config.privateKey, "legacy-private-key");
    assert.deepEqual(findOneWhere, buildLegacyGoogleAccountConfigWhere("user@example.com"));
    assert.equal(findCalled, false);
  });

  it("does not query legacy Google account config without email", async () => {
    let repositoryCalled = false;
    const fix = new GoogleCommonEabAccountKeyFix();
    fix.storageService = {
      getRepository() {
        repositoryCalled = true;
        return {};
      },
    } as any;

    const config = await fix.getLegacyGoogleAccountConfig();

    assert.equal(config, null);
    assert.equal(repositoryCalled, false);
  });

  it("skips Google common EAB account key fix outside commercial edition", async () => {
    const { GoogleCommonEabAccountKeyFix: MockedFix } = await esmock("./google-common-eab-account-key-fix.js", {
      "@certd/plus-core": {
        isComm: () => false,
      },
    });
    let pluginConfigCalled = false;
    const fix = new MockedFix();
    fix.pluginConfigService = {
      async getPluginConfig() {
        pluginConfigCalled = true;
        return null;
      },
    };

    await fix.init();

    assert.equal(pluginConfigCalled, false);
  });

  it("fixes Google common EAB account key in commercial edition", async () => {
    const { GoogleCommonEabAccountKeyFix: MockedFix } = await esmock("./google-common-eab-account-key-fix.js", {
      "@certd/plus-core": {
        isComm: () => true,
      },
    });
    let getAccessByIdArgs: any[] = [];
    let findOneWhere: any;
    let updateAccessParam: any;
    const fix = new MockedFix();
    fix.pluginConfigService = {
      async getPluginConfig(options: any) {
        assert.deepEqual(options, {
          name: "CertApply",
          type: "builtIn",
        });
        return {
          sysSetting: {
            input: {
              googleCommonEabAccessId: 12,
            },
          },
        };
      },
    };
    fix.accessService = {
      async getAccessById(...args: any[]) {
        getAccessByIdArgs = args;
        return {
          kid: "kid-1",
          email: "user@example.com",
        };
      },
      async updateAccess(param: any) {
        updateAccessParam = param;
      },
    };
    fix.storageService = {
      getRepository() {
        return {
          async findOne(options: any) {
            findOneWhere = options.where;
            return {
              value: JSON.stringify({
                value: {
                  privateKey: "legacy-private-key",
                },
              }),
            };
          },
        };
      },
    };

    await fix.init();

    assert.deepEqual(getAccessByIdArgs, [12, false]);
    assert.deepEqual(findOneWhere, buildLegacyGoogleAccountConfigWhere("user@example.com"));
    assert.deepEqual(updateAccessParam, {
      id: 12,
      eabType: "google",
      accountKey: buildEabAccountKeyValue("kid-1", "legacy-private-key"),
    });
  });
});
