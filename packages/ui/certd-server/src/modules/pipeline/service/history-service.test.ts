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

function createInterruptedService() {
  const pipeline = {
    id: "p1",
    status: { status: "start", result: "start", startTime: 1, output: {} },
    stages: [
      {
        id: "s1",
        status: { status: "start", result: "start", startTime: 1, output: {} },
        tasks: [
          {
            id: "t1",
            status: { status: "start", result: "start", startTime: 1, output: {} },
            steps: [
              {
                id: "st1",
                status: { status: "start", result: "start", startTime: 1, output: {} },
              },
            ],
          },
        ],
      },
    ],
  };
  const history: any = {
    id: 1,
    pipelineId: 10,
    status: "start",
    endTime: null,
    pipeline: JSON.stringify(pipeline),
  };

  const service = new HistoryService();
  service.repository = {
    async find() {
      return [history];
    },
    async save(entity: any) {
      history.status = entity.status;
      history.endTime = entity.endTime;
      history.pipeline = entity.pipeline;
      return entity;
    },
  } as any;

  let pipelineUpdate: any = null;
  service.pipelineRepository = {
    async update(where: any, patch: any) {
      pipelineUpdate = { where, patch };
      return { affected: 1 };
    },
  } as any;

  let logArgs: any = null;
  service.logService = {
    async appendSystemLog(historyId: number, nodeIds: string[], message: string) {
      logArgs = { historyId, nodeIds, message };
    },
  } as any;

  return {
    service,
    history,
    getPipelineUpdate: () => pipelineUpdate,
    getLogArgs: () => logArgs,
  };
}

describe("HistoryService.markRunningAsInterrupted", () => {
  it("把 start 历史标记为 error，并关闭流水线/阶段/任务/步骤状态", async () => {
    const { service, history, getPipelineUpdate, getLogArgs } = createInterruptedService();

    await service.markRunningAsInterrupted();

    assert.equal(history.status, "error");
    assert.ok(history.endTime instanceof Date);

    const pipeline = JSON.parse(history.pipeline);
    assert.equal(pipeline.status.status, "error");
    assert.equal(pipeline.status.result, "error");
    assert.equal(pipeline.stages[0].status.status, "error");
    assert.equal(pipeline.stages[0].tasks[0].status.status, "error");
    assert.equal(pipeline.stages[0].tasks[0].steps[0].status.status, "error");
    assert.match(pipeline.status.message, /服务重启/);

    assert.equal(getPipelineUpdate().patch.status, "error");
    assert.ok(getLogArgs().nodeIds.includes("st1"));
    assert.match(getLogArgs().message, /服务重启/);
  });
});
