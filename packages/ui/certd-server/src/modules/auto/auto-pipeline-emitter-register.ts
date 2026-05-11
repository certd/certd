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
    pipelineEmitter.on(EVENT_CERT_APPLY_SUCCESS, async (event: PipelineEvent<{ cert: CertInfo; file: string }>) => {
      await this.certInfoService.updateCertByPipelineId(event.pipeline.id, event.event.cert, event.event.file);
    });
  }
}
