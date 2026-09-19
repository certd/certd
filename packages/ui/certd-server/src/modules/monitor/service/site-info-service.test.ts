import assert from "node:assert/strict";
import { SiteInfoService } from "./site-info-service.js";

/**
 * 批量导入的站点（doImport → add）必须带上明确的 ipCheck/ipSyncAuto/ipIgnoreCoherence 默认值。
 * 否则数据库里这三列为 NULL，编辑弹窗的“开启IP检查”开关看着是关闭状态，
 * 但必填校验认为没有值，用户必须手动开关一次才能保存（issue #803）。
 */
function createServiceForAdd() {
  const service = new SiteInfoService();
  service.checkMonitorLimit = async () => {};
  service.repository = {
    async findOne() {
      return null;
    },
    async save(data: any) {
      return data;
    },
    async create(data: any) {
      return data;
    },
  } as any;
  return service;
}

describe("SiteInfoService", () => {
  describe("add 站点默认值（issue #803）", () => {
    it("新增站点未传 ipCheck 时，落库默认值为 false（而不是 undefined/null）", async () => {
      const service = createServiceForAdd();
      let savedData: any = null;
      service.repository.save = async (data: any) => {
        savedData = data;
        return data;
      };

      await service.add({
        domain: "a.com",
        name: "a.com",
        httpsPort: 443,
        userId: 1,
      } as any);

      assert.equal(savedData.ipCheck, false, "ipCheck 必须有明确的布尔默认值 false");
      assert.equal(savedData.ipSyncAuto, true, "ipSyncAuto 必须有明确的布尔默认值 true");
      assert.equal(savedData.ipIgnoreCoherence, false, "ipIgnoreCoherence 必须有明确的布尔默认值 false");
    });

    it("显式传入的 ipCheck 不被默认值覆盖", async () => {
      const service = createServiceForAdd();
      let savedData: any = null;
      service.repository.save = async (data: any) => {
        savedData = data;
        return data;
      };

      await service.add({
        domain: "b.com",
        name: "b.com",
        httpsPort: 443,
        userId: 1,
        ipCheck: true,
        ipSyncAuto: false,
        ipIgnoreCoherence: true,
      } as any);

      assert.equal(savedData.ipCheck, true);
      assert.equal(savedData.ipSyncAuto, false);
      assert.equal(savedData.ipIgnoreCoherence, true);
    });
  });

  describe("doImport 批量导入（issue #803）", () => {
    it("导入的每个站点落库都带上 ipCheck 默认值 false，且字段解析正确", async () => {
      const service = createServiceForAdd();
      const savedList: any[] = [];
      service.repository.save = async (data: any) => {
        savedList.push(data);
        return data;
      };

      await service.doImport({
        text: "a.com\nb.com:8443:c.com:备注",
        userId: 1,
        projectId: 2,
      });

      // add() 里已有站点时会 return {id}，此处 findOne 返回 null，两条都会真实落库
      assert.equal(savedList.length, 2);
      for (const item of savedList) {
        assert.equal(item.ipCheck, false, `站点 ${item.domain} 必须带 ipCheck 默认值`);
      }
      assert.equal(savedList[0].domain, "a.com");
      assert.equal(savedList[0].httpsPort, 443);
      assert.equal(savedList[0].name, "a.com");
      assert.equal(savedList[1].domain, "b.com");
      assert.equal(savedList[1].httpsPort, 8443);
      assert.equal(savedList[1].name, "c.com");
      assert.equal(savedList[1].remark, "备注");
    });
  });
});
