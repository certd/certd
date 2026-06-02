import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { CodeException, Constants } from "@certd/lib-server";
import { CertInfoEntity } from "../entity/cert-info.js";
import { utils } from "@certd/basic";
import { PipelineService } from "../../pipeline/service/pipeline-service.js";
import { UserSettingsService } from "../../mine/service/user-settings-service.js";
import { UserEmailSetting } from "../../mine/service/models.js";
import { PipelineEntity } from "../../pipeline/entity/pipeline.js";
import { CertInfoService } from "../service/cert-info-service.js";
import { DomainService } from "../../cert/service/domain-service.js";
import { DomainVerifierGetter } from "../../pipeline/service/getter/domain-verifier-getter.js";
import { CertApplyTemplateService } from "../../cert/service/cert-apply-template-service.js";
import { CertApplyTemplateParams } from "../../cert/service/cert-apply-template-fields.js";

@Provide("CertInfoFacade")
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class CertInfoFacade {
  @Inject()
  pipelineService: PipelineService;

  @Inject()
  certInfoService: CertInfoService;

  @Inject()
  domainService: DomainService;

  @Inject()
  userSettingsService: UserSettingsService;

  @Inject()
  certApplyTemplateService: CertApplyTemplateService;

  async getCertInfo(req: { domains?: string; certId?: number; userId: number; projectId: number; autoApply?: boolean; format?: string; autoApplyTemplateId?: number; autoApplyParams?: CertApplyTemplateParams }) {
    const { domains, certId, userId, projectId } = req;
    if (certId) {
      return await this.certInfoService.getCertInfoById({ id: certId, userId, projectId });
    }
    if (!domains) {
      throw new CodeException({
        ...Constants.res.openParamError,
        message: "参数错误，certId和domains必须传一个",
      });
    }
    const domainArr = domains.split(",");

    const matchedList = await this.certInfoService.getMatchCertList({ domains: domainArr, userId, projectId });

    if (matchedList.length === 0) {
      if (req.autoApply === true) {
        //自动申请，先创建自动申请流水线
        const pipeline: PipelineEntity = await this.createAutoPipeline({
          domains: domainArr,
          userId,
          projectId,
          autoApplyTemplateId: req.autoApplyTemplateId,
          autoApplyParams: req.autoApplyParams,
        });
        await this.triggerApplyPipeline({ pipelineId: pipeline.id });
      } else {
        throw new CodeException({
          ...Constants.res.openCertNotFound,
          message: "在证书仓库中没有找到匹配域名的证书，请先创建证书流水线，或传入autoApply参数，自动创建",
        });
      }
    }
    const matched = this.getMinixMatched(matchedList);
    if (!matched) {
      if (req.autoApply === true) {
        //如果没有找到有效期内的证书，则自动触发一次申请
        const first = matchedList[0];
        await this.triggerApplyPipeline({ pipelineId: first.pipelineId });
        return;
      } else {
        throw new CodeException({
          ...Constants.res.openCertNotFound,
          message: "证书已过期，请触发流水线申请，或者传入autoApply参数，自动触发",
        });
      }
    }

    return await this.certInfoService.getCertInfoById({ id: matched.id, userId: userId, projectId, format: req.format });
  }

  public getMinixMatched(matchedList: CertInfoEntity[]) {
    let matched: CertInfoEntity = null;
    for (const item of matchedList) {
      if (item.expiresTime > 0 && item.expiresTime > new Date().getTime()) {
        if (matched) {
          //如果前面已经有match的值，判断范围是否比上一个小
          const currentStars = `-${item.domains}`.split("*");
          const matchedStars = `-${matched.domains}`.split("*");

          const currentLength = item.domains.split(",");
          const matchedLength = matched.domains.split(",");
          if (currentStars.length < matchedStars.length) {
            //如果*的数量比上一个少，则替换为当前
            matched = item;
          } else if (currentStars.length == matchedStars.length) {
            //如果*的数量相同，则比较域名数量
            if (currentLength.length < matchedLength.length) {
              matched = item;
            }
          }
        } else {
          matched = item;
        }
      }
    }
    return matched;
  }

  async createAutoPipeline(req: { domains: string[]; userId: number; projectId: number; autoApplyTemplateId?: number; autoApplyParams?: CertApplyTemplateParams }) {
    const verifierGetter = new DomainVerifierGetter(req.userId, req.projectId, this.domainService);

    const allDomains = [];
    for (const item of req.domains) {
      allDomains.push(item.replaceAll("*.", ""));
    }
    const verifiers = await verifierGetter.getVerifiers(allDomains);
    for (const item of allDomains) {
      if (!verifiers[item]) {
        throw new CodeException({
          ...Constants.res.openDomainNoVerifier,
          message: `域名${item}没有配置校验方式，请先在域名管理页面配置`,
          data: {
            domain: item,
          },
        });
      }
    }

    const userEmailSetting = await this.userSettingsService.getSetting<UserEmailSetting>(req.userId, null, UserEmailSetting);
    if (!userEmailSetting.list) {
      throw new CodeException(Constants.res.openEmailNotFound);
    }
    const email = userEmailSetting.list[0];
    const applyParams = await this.certApplyTemplateService.resolveApplyParams({
      userId: req.userId,
      projectId: req.projectId,
      templateId: req.autoApplyTemplateId,
      params: req.autoApplyParams,
    });

    return await this.pipelineService.createAutoPipeline({
      domains: req.domains,
      email,
      projectId: req.projectId,
      userId: req.userId,
      from: "OpenAPI",
      applyParams,
    });
  }

  async triggerApplyPipeline(req: { pipelineId: number }) {
    //查询流水线状态
    const status = await this.pipelineService.getStatus(req.pipelineId);
    if (status != "running" && status != "start") {
      await this.pipelineService.trigger(req.pipelineId);
      await utils.sleep(2000);
    }
    const certInfo = await this.certInfoService.getByPipelineId(req.pipelineId);
    throw new CodeException({
      ...Constants.res.openCertApplying,
      data: {
        pipelineId: req.pipelineId,
        certId: certInfo?.id,
      },
    });
  }
}
