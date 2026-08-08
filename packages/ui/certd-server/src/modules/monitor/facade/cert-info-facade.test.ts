import assert from "node:assert/strict";
import { CertInfoFacade } from "./cert-info-facade.js";

describe("CertInfoFacade.triggerApplyPipeline", () => {
  it("returns a pipeline error when the pipeline failed within the last three hours", async () => {
    const facade = new CertInfoFacade();
    let triggered = false;
    facade.pipelineService = {
      async getStatus() {
        return {
          status: "error",
          updateTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
        };
      },
      async trigger() {
        triggered = true;
      },
    } as any;
    facade.certInfoService = {} as any;

    await assert.rejects(
      () => facade.triggerApplyPipeline({ pipelineId: 1 }),
      (error: any) => {
        assert.equal(error.code, 20015);
        return true;
      }
    );
    assert.equal(triggered, false);
  });

  it("retries a pipeline that failed more than three hours ago", async function () {
    this.timeout(5000);
    const facade = new CertInfoFacade();
    let triggered = false;
    facade.pipelineService = {
      async getStatus() {
        return {
          status: "error",
          updateTime: new Date(Date.now() - 3 * 60 * 60 * 1000 - 1),
        };
      },
      async trigger() {
        triggered = true;
      },
    } as any;
    facade.certInfoService = {
      async getByPipelineId() {
        return { id: 2 };
      },
    } as any;

    await assert.rejects(
      () => facade.triggerApplyPipeline({ pipelineId: 1 }),
      (error: any) => {
        assert.equal(error.code, 20013);
        return true;
      }
    );
    assert.equal(triggered, true);
  });
});
