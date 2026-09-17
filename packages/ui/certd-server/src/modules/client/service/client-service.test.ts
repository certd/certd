import assert from "assert";
import { ClientService, isOnline } from "./client-service.js";

function createService() {
  return new ClientService();
}

describe("ClientService", () => {
  describe("isOnline", () => {
    it("30分钟内判定在线", () => {
      const now = Date.now();
      assert.equal(isOnline(now - 29 * 60 * 1000, now), true);
      assert.equal(isOnline(now - 30 * 60 * 1000, now), true);
    });

    it("超过30分钟判定离线", () => {
      const now = Date.now();
      assert.equal(isOnline(now - 30 * 60 * 1000 - 1, now), false);
    });

    it("从未心跳判定离线", () => {
      const now = Date.now();
      assert.equal(isOnline(null, now), false);
      assert.equal(isOnline(undefined, now), false);
    });
  });

  describe("heartbeat", () => {
    it("首次心跳创建记录，统计信息打包进 content JSON", async () => {
      const service = createService();
      service.repository = {
        async findOne() {
          return null;
        },
      } as any;
      let saved: any = null;
      service.repository.save = async (entity: any) => {
        saved = entity;
        entity.id = 1;
        return entity;
      };

      const id = await service.heartbeat(2, 3, "key-1", {
        clientId: "client-a",
        machineName: "web-01",
        version: "0.3.0",
        os: "linux",
        appCount: 2,
        siteCount: 10,
        httpsSiteCount: 8,
        syncedSiteCount: 5,
        failedSiteCount: 1,
      });

      assert.equal(id, 1);
      assert.equal(saved.userId, 2);
      assert.equal(saved.projectId, 3);
      assert.equal(saved.clientId, "client-a");
      assert.equal(saved.keyId, "key-1");
      assert.equal(saved.machineName, "web-01");
      assert.equal(saved.version, "0.3.0");
      assert.equal(saved.os, "linux");
      assert.ok(saved.lastHeartbeatAt > 0);

      const snapshot = JSON.parse(saved.content);
      assert.equal(snapshot.appCount, 2);
      assert.equal(snapshot.siteCount, 10);
      assert.equal(snapshot.httpsSiteCount, 8);
      assert.equal(snapshot.syncedSiteCount, 5);
      assert.equal(snapshot.failedSiteCount, 1);
    });

    it("已有记录时更新，不重复创建", async () => {
      const service = createService();
      const existing = { id: 9 };
      service.repository = {
        async findOne() {
          return existing;
        },
      } as any;
      let updatedWhere: any = null;
      let updatedSet: any = null;
      service.repository.update = async (where: any, set: any) => {
        updatedWhere = where;
        updatedSet = set;
        return {} as any;
      };

      const id = await service.heartbeat(2, undefined, "key-2", {
        clientId: "client-a",
        machineName: "web-01",
        version: "0.3.1",
        os: "windows",
        siteCount: 3,
      });

      assert.equal(id, 9);
      assert.equal(updatedWhere.id, 9);
      assert.equal(updatedSet.machineName, "web-01");
      assert.equal(updatedSet.version, "0.3.1");
      assert.equal(updatedSet.os, "windows");
      assert.ok(updatedSet.lastHeartbeatAt > 0);
      const snapshot = JSON.parse(updatedSet.content);
      assert.equal(snapshot.siteCount, 3);
      // 未传的统计字段默认 0
      assert.equal(snapshot.appCount, 0);
      assert.equal(snapshot.httpsSiteCount, 0);
    });

    it("clientId 为空时抛错", async () => {
      const service = createService();
      service.repository = {
        async findOne() {
          return null;
        },
      } as any;
      await assert.rejects(() => service.heartbeat(2, undefined, "key", {} as any), /clientId不能为空/);
    });
  });
});
