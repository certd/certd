import assert from "assert";
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
});
