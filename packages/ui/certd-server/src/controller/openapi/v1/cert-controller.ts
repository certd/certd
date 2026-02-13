import { ALL, Body, Controller, Get, Inject, Post, Provide, Query } from "@midwayjs/core";
import { CodeException, Constants, EncryptService } from "@certd/lib-server";
import { CertInfo } from "@certd/plugin-cert";
import { OpenKey } from "../../../modules/open/service/open-key-service.js";
import { BaseOpenController } from "../base-open-controller.js";
import { CertInfoFacade } from "../../../modules/monitor/facade/cert-info-facade.js";
import { merge } from "lodash-es";

export type CertGetReq = {
  domains?: string;
  certId: number;
  autoApply?:boolean;
  format?:string; //默认是所有,pem,der,p12,pfx,jks,one,p7b
};

/**
 */
@Provide()
@Controller('/api/v1/cert')
export class OpenCertController extends BaseOpenController {
  @Inject()
  certInfoFacade: CertInfoFacade;
  @Inject()
  encryptService: EncryptService;

  @Get('/get', { summary: Constants.per.open })
  @Post('/get', { summary: Constants.per.open })
  async get(@Body(ALL) bean: CertGetReq, @Query(ALL) query: CertGetReq) {
    const openKey: OpenKey = this.ctx.openKey;
    const userId = openKey.userId;
    
    if (!userId) {
      throw new CodeException(Constants.res.openKeyError);
    }
    const projectId = openKey.projectId;

    const req = merge({}, bean, query)

    const res: CertInfo = await this.certInfoFacade.getCertInfo({
      userId,
      domains: req.domains,
      certId: req.certId,
      autoApply: req.autoApply??false,
      format: req.format,
      projectId,
    });
    return this.ok(res);
  }
}
