import assert from "node:assert/strict";
import { TemplateService } from "./template-service.js";

describe("TemplateService.createPipelineByTemplate", () => {

  it("creates a new pipeline for an owned template", async () => {
    const service = new TemplateService();
    service.info = async () => ({ id: 7, userId: 1018, projectId: null, pipelineId: 22 }) as any;
    let saved: any;
    service.pipelineService = {
      async info() {
        return { type: "custom", keepHistoryCount: 10 };
      },
      async save(bean: any) {
        saved = bean;
        assert.equal(bean.id, undefined);
        bean.id = 100;
      },
    } as any;

    const result = await service.createPipelineByTemplate({ templateId: 7, userId: 1018, projectId: null } as any);

    assert.equal(saved.id, 100);
    assert.equal(result.id, 100);
  });
});
