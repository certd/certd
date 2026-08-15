import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { CertInfoService } from "../monitor/index.js";
import { pipelineEmitter } from "@certd/pipeline";
import { CertInfo, EVENT_CERT_APPLY_SUCCESS } from "@certd/plugin-cert";
import { PipelineEvent } from "@certd/pipeline";

@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class AutoPipelineEmitterRegister {
  @Inject()
  certInfoService: CertInfoService;

  async init() {
    await this.onCertApplySuccess();
  }

  async onCertApplySuccess() {
    pipelineEmitter.on(EVENT_CERT_APPLY_SUCCESS, async (event: PipelineEvent<{ cert: CertInfo }>) => {
      const pipeline = event.pipeline as any;
      await this.certInfoService.updateCertByPipelineId(pipeline.id, event.event.cert, "pipeline", pipeline.userId, pipeline.projectId);
    });
  }
}
