import assert from "node:assert/strict";
import { HistoryService } from "./history-service.js";

describe("HistoryService.deleteByIds", () => {
  it("deletes logs only for history rows that matched the owner filter", async () => {
    const service = new HistoryService();
    let deletedCondition: any;
    let deletedLogIds: number[] = [];
    service.repository = {
      async find({ where }: any) {
        assert.equal(where.userId, 7);
        return [{ id: 10 }];
      },
      async delete(condition: any) {
        deletedCondition = condition;
      },
    } as any;
    service.logService = {
      async deleteByHistoryIds(ids: number[]) {
        deletedLogIds = ids;
      },
    } as any;

    await service.deleteByIds([10, 99], 7, null);

    assert.deepEqual(deletedLogIds, [10]);
    assert.deepEqual(deletedCondition.id._value, [10]);
  });
});
