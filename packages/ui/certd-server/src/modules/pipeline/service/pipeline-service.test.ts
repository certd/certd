import assert from "node:assert/strict";
import esmock from "esmock";
import { executorQueue, ValidateException } from "@certd/lib-server";
import { PipelineEntity } from "../entity/pipeline.js";
import { PipelineService } from "./pipeline-service.js";

describe("PipelineService", () => {
  it("blocks a pipeline when a matching security ban exists", async () => {
    const service = new PipelineService();
    let banQuery: any;
    service.securityBanService = {
      async isBlocked(query: any) {
        banQuery = query;
        return true;
      },
    } as any;
    const entity = new PipelineEntity();
    entity.id = 42;
    entity.userId = 17;

    await assert.rejects(() => service.beforeCheck(entity), /禁止运行/);
    assert.deepEqual(banQuery, { userId: 17, pipelineIds: [42], scope: "pipeline" });
  });

  for (const stepId of [undefined, "ALL"]) {
    it(`returns the original precheck error to manual triggers with stepId=${stepId}`, async () => {
      const service = new PipelineService();
      const error = new ValidateException("部署次数不足");
      let historyStarted = false;
      const entity = new PipelineEntity();
      entity.id = 1;
      service.info = async () => entity;
      service.beforeCheck = async () => {
        throw error;
      };
      service.historyService = {
        async start() {
          historyStarted = true;
        },
      } as any;

      await assert.rejects(
        () => service.trigger(entity.id, stepId),
        (e: unknown) => e === error
      );
      assert.equal(historyStarted, false);
    });
  }

  it("rejects a missing pipeline before checking or starting it", async () => {
    const service = new PipelineService();
    service.info = async () => null;
    await assert.rejects(() => service.run({ id: 42 }), /流水线42不存在/);
  });

  for (const wait of [true, false]) {
    it(`returns execution metadata and waits only for run (wait=${wait})`, async () => {
      let finishExecution: () => void;
      let startExecution: () => void;
      let clearedStepId: string;
      const completed = new Promise<void>(resolve => {
        finishExecution = resolve;
      });
      const started = new Promise<void>(resolve => {
        startExecution = resolve;
      });
      const { PipelineService: MockedPipelineService } = await esmock("./pipeline-service.js", {
        "@certd/plus-core": { isComm: () => false },
        "@certd/pipeline": {
          Executor: class {
            async init() {}
            clearLastStatus(stepId: string) {
              clearedStepId = stepId;
            }
            async run(historyId: number, triggerType: string) {
              assert.equal(historyId, 12);
              assert.equal(triggerType, "user");
              startExecution();
              await completed;
            }
          },
        },
      });
      const service = new MockedPipelineService();
      service.info = async () => ({ id: 42, content: JSON.stringify({ stages: [{ id: "stage1", tasks: [] }] }) });
      service.beforeCheck = async () => ({});
      service.historyService = { start: async () => 12 };
      service.userSettingsService = { incrementStatistic: async () => {} };
      service.taskServiceBuilder = { create: () => ({ get: async () => ({}) }) };
      service.certdConfig = { fileRootDir: "unused" };
      let execution: Promise<unknown>;
      if (wait) {
        execution = service.run({ id: 42, stepId: "ALL" });
      } else {
        execution = service.trigger(42, "ALL");
      }
      let returned = false;
      const pending = execution.then(result => {
        returned = true;
        return result;
      });
      try {
        await started;
        await new Promise<void>(resolve => setImmediate(resolve));
        assert.equal(returned, !wait);
        assert.equal(clearedStepId, "ALL");
      } finally {
        finishExecution();
      }
      assert.deepEqual(await pending, { pipelineId: 42, triggerType: "user", historyId: 12 });
    });
  }

  it("propagates precheck errors to automatic callers without starting a run", async () => {
    const service = new PipelineService();
    const error = new Error("部署次数不足");
    let historyStarted = false;

    service.beforeCheck = async () => {
      throw error;
    };
    service.userService = {
      async isAdmin() {
        return false;
      },
    } as any;
    service.historyService = {
      async start() {
        historyStarted = true;
        throw new Error("history should not start");
      },
    } as any;

    const entity = new PipelineEntity();
    entity.id = 1;
    entity.userId = 1;
    entity.projectId = 0;
    entity.content = JSON.stringify({
      stages: [{ id: "stage1", tasks: [] }],
      triggers: [],
    });

    service.info = async () => entity;
    await assert.rejects(
      () => service.run({ id: entity.id, triggerId: "timer1", stepId: "ALL" }),
      (e: unknown) => e === error
    );

    assert.equal(historyStarted, false);
  });

  for (const force of [false, true]) {
    it(`handles individual batch run errors with force=${force}`, async () => {
      const service = new PipelineService();
      const tasks: { task: () => Promise<void> }[] = [];
      const calls: { id: number; stepId?: string }[] = [];
      service.run = async req => {
        calls.push(req);
        if (req.id === 1) {
          throw new Error("部署次数不足");
        }
        return { pipelineId: req.id, triggerType: "user", historyId: 2 };
      };
      const originalAddTask = executorQueue.addTask;
      executorQueue.addTask = (_userId, task) => {
        tasks.push(task);
      };
      try {
        service.startBatchRerun(17, [1, 2], force);
      } finally {
        executorQueue.addTask = originalAddTask;
      }

      assert.equal(tasks.length, 2);
      for (const task of tasks) {
        await assert.doesNotReject(() => task.task());
      }
      let stepId: string;
      if (force) {
        stepId = "ALL";
      }
      assert.deepEqual(calls, [
        { id: 1, stepId },
        { id: 2, stepId },
      ]);
    });
  }

  it("getCronNextTimes returns empty list for invalid cron such as Feb 31", () => {
    const service = new PipelineService();
    //2月31号：cron-parser会抛 Invalid explicit day of month definition
    const nextTimes = service.getCronNextTimes("0 0 0 31 2 *", 1);
    assert.deepEqual(nextTimes, []);
  });

  it("getCronNextTimes returns next time for valid cron", () => {
    const service = new PipelineService();
    //1月31号是合法日期
    const nextTimes = service.getCronNextTimes("0 0 0 31 1 *", 1);
    assert.equal(nextTimes.length, 1);
  });

  it("checkTriggers throws ValidateException for invalid cron such as Feb 31", () => {
    const service = new PipelineService();
    const pipeline: any = {
      triggers: [{ id: "t1", type: "timer", props: { cron: "0 0 0 31 2 *" } }],
    };
    assert.throws(
      () => (service as any).checkTriggers(pipeline),
      (e: any) => e instanceof ValidateException
    );
  });

  it("checkTriggers ignores non-timer triggers and empty cron", () => {
    const service = new PipelineService();
    const pipeline: any = {
      triggers: [
        { id: "t1", type: "webhook", props: { url: "http://example.com" } },
        { id: "t2", type: "timer", props: {} },
      ],
    };
    assert.doesNotThrow(() => (service as any).checkTriggers(pipeline));
  });

  it("checkTriggers passes for valid cron", () => {
    const service = new PipelineService();
    const pipeline: any = {
      triggers: [
        { id: "t1", type: "timer", props: { cron: "0 0 0 31 1 *" } },
        { id: "t2", type: "timer", props: { cron: "0 0 0 * * *" } },
      ],
    };
    assert.doesNotThrow(() => (service as any).checkTriggers(pipeline));
  });

  describe("registerCron normalizes every-minute cron like the client editor does", () => {
    function createService() {
      const service = new PipelineService();
      const registered: any[] = [];
      service.cron = {
        remove() {},
        register(req: any) {
          registered.push(req);
        },
        getTaskSize() {
          return registered.length;
        },
      } as any;
      return { service, registered };
    }

    it('normalizes "* * 15 * *" to "0 0 15 * *" without eating the first digit of the day field', () => {
      //与客户端 cron-editor 的归一化结果保持一致：分钟与小时均为 * 时，置为 0 0，其余字段原样保留
      const { service, registered } = createService();
      service.registerCron(1, 1, { id: "t1", type: "timer", props: { cron: "* * 15 * *" } });
      assert.equal(registered.length, 1);
      assert.equal(registered[0].cron, "0 0 15 * *");
    });

    it('keeps registration for "* * 1 * *" (single-digit day must not be dropped)', () => {
      const { service, registered } = createService();
      service.registerCron(1, 1, { id: "t1", type: "timer", props: { cron: "* * 1 * *" } });
      assert.equal(registered.length, 1);
      assert.equal(registered[0].cron, "0 0 1 * *");
    });

    it('normalizes "* * * * *" to "0 0 * * *"', () => {
      const { service, registered } = createService();
      service.registerCron(1, 1, { id: "t1", type: "timer", props: { cron: "* * * * *" } });
      assert.equal(registered.length, 1);
      assert.equal(registered[0].cron, "0 0 * * *");
    });

    it('keeps the existing correct normalization for "* 12 * * *"', () => {
      const { service, registered } = createService();
      service.registerCron(1, 1, { id: "t1", type: "timer", props: { cron: "* 12 * * *" } });
      assert.equal(registered.length, 1);
      assert.equal(registered[0].cron, "0 12 * * *");
    });
  });
});
