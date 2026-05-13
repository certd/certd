import assert from "assert";
import esmock from "esmock";
import { AutoFix, buildEabAccountKeyValue, buildLegacyGoogleAccountConfigWhere, buildOauthBoundType, parseStorageValue } from "./auto-fix.js";

function createAutoFix(options: { pluginConfigService?: any; accessService?: any; storageService?: any; sysSettingsService?: any; oauthBoundService?: any }) {
  const autoFix = new AutoFix();
  autoFix.pluginConfigService = options.pluginConfigService;
  autoFix.accessService = options.accessService;
  autoFix.storageService = options.storageService;
  autoFix.sysSettingsService = options.sysSettingsService;
  autoFix.oauthBoundService = options.oauthBoundService;
  return autoFix;
}

describe("AutoFix", () => {
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

  it("builds OAuth subtype bound type", () => {
    assert.equal(buildOauthBoundType("clogin", "alipay"), "clogin:alipay");
    assert.equal(buildOauthBoundType("github"), "github");
  });

  it("finds legacy Google account config by exact email key only", async () => {
    let findOneWhere: any;
    let findCalled = false;
    const autoFix = createAutoFix({
      pluginConfigService: null as any,
      accessService: null as any,
      storageService: {
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
      } as any,
    });

    const config = await autoFix.getLegacyGoogleAccountConfig("user@example.com");

    assert.equal(config.privateKey, "legacy-private-key");
    assert.deepEqual(findOneWhere, buildLegacyGoogleAccountConfigWhere("user@example.com"));
    assert.equal(findCalled, false);
  });

  it("does not query legacy Google account config without email", async () => {
    let repositoryCalled = false;
    const autoFix = createAutoFix({
      pluginConfigService: null as any,
      accessService: null as any,
      storageService: {
        getRepository() {
          repositoryCalled = true;
          return {};
        },
      } as any,
    });

    const config = await autoFix.getLegacyGoogleAccountConfig();

    assert.equal(config, null);
    assert.equal(repositoryCalled, false);
  });

  it("skips Google common EAB account key fix outside commercial edition", async () => {
    let pluginConfigCalled = false;
    const autoFix = createAutoFix({
      pluginConfigService: {
        async getPluginConfig() {
          pluginConfigCalled = true;
          return null;
        },
      } as any,
      accessService: null as any,
      storageService: null as any,
      sysSettingsService: {
        async getPublicSettings() {
          return {
            oauthProviders: {},
          };
        },
      },
      oauthBoundService: {
        async transaction(callback: any) {
          return await callback({
            async findOne() {
              return null;
            },
            async update() {
              return { affected: 0 };
            },
          });
        },
      },
    });

    await autoFix.init();

    assert.equal(pluginConfigCalled, false);
  });

  it("fixes Google common EAB account key in commercial edition", async () => {
    const { AutoFix: MockedAutoFix } = await esmock("./auto-fix.js", {
      "@certd/plus-core": {
        isComm: () => true,
      },
    });
    let getAccessByIdArgs: any[] = [];
    let findOneWhere: any;
    let updateAccessParam: any;
    const autoFix = new MockedAutoFix();
    autoFix.pluginConfigService = {
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
    autoFix.accessService = {
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
    autoFix.storageService = {
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

    await autoFix.fixGoogleCommonEabAccountKey();

    assert.deepEqual(getAccessByIdArgs, [12, false]);
    assert.deepEqual(findOneWhere, buildLegacyGoogleAccountConfigWhere("user@example.com"));
    assert.deepEqual(updateAccessParam, {
      id: 12,
      eabType: "google",
      accountKey: buildEabAccountKeyValue("kid-1", "legacy-private-key"),
    });
  });

  it("fixes legacy OAuth bound type from string addon loginType and converts loginType to array", async () => {
    const updates: any[] = [];
    const autoFix = createAutoFix({
      pluginConfigService: null as any,
      accessService: null as any,
      storageService: null as any,
      sysSettingsService: {
        async getPublicSettings() {
          return {
            oauthProviders: {
              clogin: {
                addonId: 1,
              },
            },
          };
        },
      },
      oauthBoundService: {
        async transaction(callback: any) {
          return await callback({
            async findOne(entity: any, options: any) {
              assert.equal(entity.name, "AddonEntity");
              assert.deepEqual(options, { where: { id: 1 } });
              return {
                id: 1,
                setting: JSON.stringify({
                  loginType: "alipay",
                }),
              };
            },
            async update(entity: any, where: any, value: any) {
              updates.push({ entity: entity.name, where, value });
              return { affected: entity.name === "OauthBoundEntity" ? 1 : 0 };
            },
          });
        },
      },
    });

    await autoFix.fixOauthSubtypeBoundType();

    assert.deepEqual(updates[0], {
      entity: "OauthBoundEntity",
      where: { type: "clogin" },
      value: { type: "clogin:alipay" },
    });
    assert.equal(updates[1].entity, "AddonEntity");
    assert.deepEqual(updates[1].where, { id: 1 });
    assert.deepEqual(JSON.parse(updates[1].value.setting).loginType, ["alipay"]);
  });

  it("skips OAuth subtype fix when addon loginType is already not legacy string", async () => {
    let updateCalled = false;
    const autoFix = createAutoFix({
      pluginConfigService: null as any,
      accessService: null as any,
      storageService: null as any,
      sysSettingsService: {
        async getPublicSettings() {
          return {
            oauthProviders: {
              clogin: {
                addonId: 1,
              },
            },
          };
        },
      },
      oauthBoundService: {
        async transaction(callback: any) {
          return await callback({
            async findOne() {
              return {
                id: 1,
                setting: JSON.stringify({
                  loginType: ["alipay", "github"],
                }),
              };
            },
            async update() {
              updateCalled = true;
              return { affected: 0 };
            },
          });
        },
      },
    });

    await autoFix.fixOauthSubtypeBoundType();

    assert.equal(updateCalled, false);
  });

});
