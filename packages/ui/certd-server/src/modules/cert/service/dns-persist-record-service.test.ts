import assert from "assert";
import { buildDnsPersistRecordValue, DnsPersistRecordService } from "./dns-persist-record-service.js";

describe("DnsPersistRecordService", () => {
  it("builds dns-persist-01 record value", () => {
    const value = buildDnsPersistRecordValue({
      accountUri: "https://example.com/acct/1",
      wildcard: true,
      persistUntil: 1893456000,
    });

    assert.equal(value, "letsencrypt.org; accounturi=https://example.com/acct/1; policy=wildcard; persistUntil=1893456000");
  });

  it("builds validation host from wildcard domain", async () => {
    const service = new DnsPersistRecordService();

    const record = await service.buildRecord({
      domain: "*.example.com",
      accountUri: "https://example.com/acct/1",
      wildcard: true,
    });

    assert.equal(record.hostRecord, "_validation-persist");
  });

  it("builds relative validation host from subdomain", async () => {
    const service = new DnsPersistRecordService();

    const record = await service.buildRecord({
      domain: "aaa.handsfree.work",
      accountUri: "https://example.com/acct/1",
    });

    assert.equal(record.hostRecord, "_validation-persist.aaa");
    assert.equal(record.mainDomain, "handsfree.work");
    assert.equal(record.recordValue, "letsencrypt.org; accounturi=https://example.com/acct/1; policy=wildcard");
  });

  it("builds dns-persist record from acme account access", async () => {
    const service = new DnsPersistRecordService();
    (service as any).accessService = {
      async getAccessById(id: number, checkUser: boolean, userId?: number) {
        assert.equal(id, 12);
        assert.equal(checkUser, true);
        assert.equal(userId, 1);
        return {
          account: JSON.stringify({
            accountKey: "private-key",
            accountUri: "https://example.com/acct/1",
            caType: "zerossl",
          }),
        };
      },
    };

    const record = await service.buildRecordByAcmeAccount({
      domain: "*.example.com",
      caType: "zerossl",
      acmeAccountAccessId: 12,
      userId: 1,
      projectId: 2,
    });

    assert.equal(record.domain, "example.com");
    assert.equal(record.caType, "zerossl");
    assert.equal(record.acmeAccountAccessId, 12);
    assert.equal(record.accountUri, "https://example.com/acct/1");
    assert.equal(record.hostRecord, "_validation-persist");
    assert.equal(record.mainDomain, "example.com");
    assert.equal(record.recordValue, "letsencrypt.org; accounturi=https://example.com/acct/1; policy=wildcard");
    assert.equal(record.policy, "wildcard");
    assert.equal(record.status, "pending");
  });

  it("rejects mismatched ca type", async () => {
    const service = new DnsPersistRecordService();
    (service as any).accessService = {
      async getAccessById() {
        return {
          account: JSON.stringify({
            accountKey: "private-key",
            accountUri: "https://example.com/acct/1",
            caType: "google",
          }),
        };
      },
    };

    await assert.rejects(
      () =>
        service.buildRecordByAcmeAccount({
          domain: "example.com",
          caType: "zerossl",
          acmeAccountAccessId: 12,
          userId: 1,
        }),
      /颁发机构不匹配/
    );
  });

  it("returns full local record after add and triggers auto create hook", async () => {
    const service = new DnsPersistRecordService();
    let saved: any = null;
    let autoCreateId: number | null = null;
    (service as any).repository = {
      async save(param: any) {
        param.id = 77;
        saved = { ...param };
      },
      async findOneBy(where: any) {
        return where.id === 77 ? saved : null;
      },
      async findOne() {
        return null;
      },
    };
    (service as any).accessService = {
      async getAccessById() {
        return {
          account: JSON.stringify({
            accountKey: "private-key",
            accountUri: "https://example.com/acct/1",
            caType: "letsencrypt",
          }),
        };
      },
    };
    (service as any).tryAutoCreateDnsTxt = async (id: number) => {
      autoCreateId = id;
    };

    const record: any = await service.add({
      domain: "example.com",
      mainDomain: "example.com",
      caType: "letsencrypt",
      acmeAccountAccessId: 1,
      userId: 1,
      projectId: 2,
    });

    assert.equal(autoCreateId, 77);
    assert.equal(record.id, 77);
    assert.equal(record.hostRecord, "_validation-persist");
    assert.equal(record.mainDomain, "example.com");
    assert.equal(record.recordValue, "letsencrypt.org; accounturi=https://example.com/acct/1; policy=wildcard");
    assert.equal(record.status, "pending");
  });

  it("reuses existing record for the same domain and acme account", async () => {
    const service = new DnsPersistRecordService();
    let saveCount = 0;
    const exists = {
      id: 88,
      domain: "example.com",
      mainDomain: "example.com",
      caType: "letsencrypt",
      acmeAccountAccessId: 1,
      userId: 1,
      projectId: 2,
      hostRecord: "_validation-persist",
      recordValue: "letsencrypt.org; accounturi=https://example.com/acct/1; policy=wildcard",
      policy: "wildcard",
      status: "valid",
    };
    (service as any).repository = {
      async save() {
        saveCount++;
      },
      async findOne(options: any) {
        return options.where.domain === "example.com" && options.where.acmeAccountAccessId === 1 ? exists : null;
      },
    };
    (service as any).accessService = {
      async getAccessById() {
        return {
          account: JSON.stringify({
            accountKey: "private-key",
            accountUri: "https://example.com/acct/1",
            caType: "letsencrypt",
          }),
        };
      },
    };

    const record: any = await service.add({
      domain: "example.com",
      mainDomain: "example.com",
      caType: "letsencrypt",
      acmeAccountAccessId: 1,
      userId: 1,
      projectId: 2,
    });

    assert.equal(saveCount, 0);
    assert.equal(record.id, 88);
    assert.equal(record.status, "valid");
  });

  it("upgrades existing non-wildcard record to wildcard and pending", async () => {
    const service = new DnsPersistRecordService();
    let saved: any = {
      id: 89,
      domain: "example.com",
      mainDomain: "example.com",
      caType: "letsencrypt",
      acmeAccountAccessId: 1,
      userId: 1,
      projectId: 2,
      hostRecord: "_validation-persist",
      recordValue: "letsencrypt.org; accounturi=https://example.com/acct/1",
      policy: null,
      status: "valid",
      recordRes: JSON.stringify({ old: true }),
    };
    (service as any).repository = {
      async save(param: any) {
        saved = { ...saved, ...param };
      },
      async findOne(options: any) {
        return options.where.domain === "example.com" && options.where.acmeAccountAccessId === 1 ? saved : null;
      },
      async findOneBy(where: any) {
        return where.id === 89 ? saved : null;
      },
    };
    (service as any).accessService = {
      async getAccessById() {
        return {
          account: JSON.stringify({
            accountKey: "private-key",
            accountUri: "https://example.com/acct/1",
            caType: "letsencrypt",
          }),
        };
      },
    };

    const record: any = await service.add({
      domain: "example.com",
      caType: "letsencrypt",
      acmeAccountAccessId: 1,
      userId: 1,
      projectId: 2,
    });

    assert.equal(record.id, 89);
    assert.equal(record.policy, "wildcard");
    assert.equal(record.status, "pending");
    assert.equal(record.mainDomain, "example.com");
    assert.equal(record.recordValue, "letsencrypt.org; accounturi=https://example.com/acct/1; policy=wildcard");
    assert.equal(record.recordRes, null);
  });

  it("returns manual cleanup hint when deleting record", async () => {
    const service = new DnsPersistRecordService();
    let deletedIds: any = null;
    (service as any).repository = {
      async findOneBy(where: any) {
        return where.id === 90
          ? {
              id: 90,
              domain: "example.com",
              mainDomain: "example.com",
              hostRecord: "_validation-persist",
              recordValue: "letsencrypt.org; accounturi=https://example.com/acct/1; policy=wildcard",
              recordRes: null,
            }
          : null;
      },
      async delete(ids: any) {
        deletedIds = ids;
      },
    };

    await service.delete([90]);

    assert.deepEqual(deletedIds.id._value, [90]);
    assert.match(service.lastDeleteMessage, /请到域名供应商删除TXT记录/);
    assert.match(service.lastDeleteMessage, /_validation-persist/);
  });

  it("triggers dns-persist verification asynchronously", async () => {
    const service = new DnsPersistRecordService();
    const savedStatuses: string[] = [];
    let saved: any = {
      id: 91,
      domain: "example.com",
      mainDomain: "example.com",
      hostRecord: "_validation-persist",
      recordValue: "letsencrypt.org; accounturi=https://example.com/acct/1; policy=wildcard",
      status: "pending",
    };
    (service as any).repository = {
      async findOneBy(where: any) {
        return where.id === 91 ? saved : null;
      },
      async save(param: any) {
        saved = { ...saved, ...param };
        savedStatuses.push(saved.status);
      },
    };
    (service as any).checkRecord = async () => true;

    const triggered = await service.triggerVerify(91);

    assert.equal(triggered, true);
    assert.equal(saved.status, "validating");

    await new Promise(resolve => setTimeout(resolve, 10));

    assert.deepEqual(savedStatuses, ["validating", "valid"]);
    assert.equal(saved.status, "valid");
  });
});
