import assert from "assert";
import { buildLegacyCommonEabAccountStorageWhere, CommonEabToAcmeAccountFix, parseEabAccountKey } from "./common-eab-to-acme-account-fix.js";
import { AcmeService } from "../../../plugins/plugin-cert/plugin/cert-plugin/acme.js";

describe("CommonEabToAcmeAccountFix", () => {
  it("parses legacy EAB account key payload", () => {
    assert.equal(
      parseEabAccountKey(
        JSON.stringify({
          kid: "kid-1",
          privateKey: "private-key",
        })
      ),
      "private-key"
    );
  });

  it("builds legacy common EAB account storage query", () => {
    assert.deepEqual(buildLegacyCommonEabAccountStorageWhere("google", 12), {
      userId: 0,
      scope: "user",
      namespace: "0",
      key: "acme.config.google.access.12",
    });
  });

  it("creates common acme account from common eab and legacy storage", async () => {
    let addParam: any;
    const fix = new CommonEabToAcmeAccountFix();
    fix.accessService = {
      async getAccessById(id: number) {
        assert.equal(id, 12);
        return {
          accountKey: JSON.stringify({
            privateKey: "private-key",
          }),
          email: "common@example.com",
        };
      },
      async findOne() {
        return null;
      },
      async add(param: any) {
        addParam = param;
        return { id: 99 };
      },
    } as any;
    fix.storageService = {
      getRepository() {
        return {
          async findOne(options: any) {
            assert.deepEqual(options.where, buildLegacyCommonEabAccountStorageWhere("google", 12));
            return {
              value: JSON.stringify({
                value: {
                  accountUrl: "https://example.com/acct/1",
                },
              }),
            };
          },
        };
      },
    } as any;

    const id = await fix.createCommonAcmeAccountFromEab("google", 12);

    assert.equal(id, 99);
    assert.equal(addParam.userId, 0);
    assert.equal(addParam.type, "acmeAccount");
    const setting = JSON.parse(addParam.setting);
    const account = JSON.parse(setting.account);
    assert.equal(account.accountKey, "private-key");
    assert.equal(account.accountUri, "https://example.com/acct/1");
  });

  it("creates common acme account by resolving account uri from eab private key", async () => {
    const original = AcmeService.prototype.getAcmeClient;
    const calls: string[] = [];
    AcmeService.prototype.getAcmeClient = async function (email: string) {
      calls.push(email);
      return {
        getAccountUrl() {
          return "https://example.com/acct/generated";
        },
      } as any;
    };

    try {
      let addParam: any;
      const fix = new CommonEabToAcmeAccountFix();
      fix.accessService = {
        async getAccessById(id: number) {
          assert.equal(id, 12);
          return {
            id: 12,
            kid: "kid-1",
            hmacKey: "hmac-1",
            accountKey: JSON.stringify({
              kid: "kid-1",
              privateKey: "private-key",
            }),
            email: "common@example.com",
          };
        },
        async findOne() {
          return null;
        },
        async add(param: any) {
          addParam = param;
          return { id: 100 };
        },
      } as any;
      fix.storageService = {
        getRepository() {
          return {
            async findOne() {
              return null;
            },
          };
        },
      } as any;

      const id = await fix.createCommonAcmeAccountFromEab("google", 12);

      assert.equal(id, 100);
      assert.deepEqual(calls, ["common@example.com"]);
      const setting = JSON.parse(addParam.setting);
      const account = JSON.parse(setting.account);
      assert.equal(account.accountKey, "private-key");
      assert.equal(account.accountUri, "https://example.com/acct/generated");
    } finally {
      AcmeService.prototype.getAcmeClient = original;
    }
  });
});
