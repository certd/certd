import assert from "assert";
import { ValidateException } from "@certd/lib-server";
import { PipelineEntity } from "../entity/pipeline.js";
import { PipelineService } from "./pipeline-service.js";

describe("PipelineService", () => {
  it("does not start a pipeline run when beforeCheck fails", async () => {
    const service = new PipelineService();
    let historyStarted = false;

    service.beforeCheck = async () => {
      throw new Error("部署次数不足");
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

    await service.doRun(entity, null, "ALL");

    assert.equal(historyStarted, false);
  });

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
});
