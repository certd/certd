import { pipelineEmitter, PipelineEvent } from "@certd/pipeline";
import { CertInfo, EVENT_CERT_APPLY_SUCCESS } from "@certd/plugin-cert";
import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { CertInfoService } from "../monitor/index.js";

@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class AutoPipelineEmitterRegister {
  @Inject()
  certInfoService: CertInfoService;

  async init() {
    await this.onCertApplySuccess();
  }

  async onCertApplySuccess() {
    pipelineEmitter.on(EVENT_CERT_APPLY_SUCCESS, async (event: PipelineEvent<CertInfo>) => {
      const taskId = event.runnableId;
      const pipelineId = event.pipelineId;
      await this.certInfoService.updateCertByPipelineId(pipelineId, event.cert, "pipeline", taskId);
    });
  }
}
