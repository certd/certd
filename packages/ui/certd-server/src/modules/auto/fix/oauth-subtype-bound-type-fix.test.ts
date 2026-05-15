import assert from "assert";
import { buildOauthBoundType, OauthSubtypeBoundTypeFix } from "./oauth-subtype-bound-type-fix.js";

describe("OauthSubtypeBoundTypeFix", () => {
  it("builds OAuth subtype bound type", () => {
    assert.equal(buildOauthBoundType("clogin", "alipay"), "clogin:alipay");
    assert.equal(buildOauthBoundType("github"), "github");
  });

  it("fixes legacy OAuth bound type from string addon loginType and converts loginType to array", async () => {
    const updates: any[] = [];
    const fix = new OauthSubtypeBoundTypeFix();
    fix.sysSettingsService = {
      async getPublicSettings() {
        return {
          oauthProviders: {
            clogin: {
              addonId: 1,
            },
          },
        };
      },
    } as any;
    fix.oauthBoundService = {
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
    } as any;

    await fix.init();

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
    const fix = new OauthSubtypeBoundTypeFix();
    fix.sysSettingsService = {
      async getPublicSettings() {
        return {
          oauthProviders: {
            clogin: {
              addonId: 1,
            },
          },
        };
      },
    } as any;
    fix.oauthBoundService = {
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
    } as any;

    await fix.init();

    assert.equal(updateCalled, false);
  });
});
