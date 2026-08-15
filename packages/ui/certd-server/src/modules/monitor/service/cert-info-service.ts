import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { AccessService, BaseService, CodeException, Constants, PageReq } from "@certd/lib-server";
import { InjectEntityModel } from "@midwayjs/typeorm";
import { Between, IsNull, LessThan, Not, Repository } from "typeorm";
import { CertInfoEntity, CertStatus } from "../entity/cert-info.js";
import { logger, utils } from "@certd/basic";
import { CertInfo, CertReader } from "@certd/plugin-cert";
import { AcmeService } from "../../../plugins/plugin-cert/plugin/cert-plugin/acme.js";
import { PipelineEntity } from "../../pipeline/entity/pipeline.js";

export type UploadCertReq = {
  id?: number;
  certReader: CertReader;
  fromType?: string;
  userId?: number;
  projectId?: number;
  pipelineId?: number;
};

@Provide("CertInfoService")
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class CertInfoService extends BaseService<CertInfoEntity> {
  @InjectEntityModel(CertInfoEntity)
  repository: Repository<CertInfoEntity>;

  @Inject()
  accessService: AccessService;

  @InjectEntityModel(PipelineEntity)
  pipelineRepository: Repository<PipelineEntity>;

  //@ts-ignore
  getRepository() {
    return this.repository;
  }

  async page(pageReq: PageReq<CertInfoEntity>) {
    return await super.page(pageReq);
  }

  async getUserDomainCount(userId: number) {
    if (userId == null) {
      throw new Error("userId is required");
    }
    // 只统计激活状态的证书，未激活/已吊销的旧证书不再占用域名额度
    return await this.repository.sum("domainCount", {
      userId,
      status: CertStatus.active,
    });
  }

  async getUserWildcardDomainCount(userId: number) {
    if (userId == null) {
      throw new Error("userId is required");
    }
    // 只统计激活状态的证书，未激活/已吊销的旧证书不再占用泛域名额度
    return await this.repository.sum("wildcardDomainCount", {
      userId,
      status: CertStatus.active,
    });
  }

  countWildcardDomains(domains?: string[]) {
    if (!domains) {
      return 0;
    }
    return domains.filter(domain => domain?.trim().toLowerCase().startsWith("*.")).length;
  }

  async deleteByPipelineId(id: number) {
    if (!id) {
      return;
    }
    await this.repository.delete({
      pipelineId: id,
    });
  }

  async getMatchCertList(params: { domains: string[]; userId: number; projectId?: number }) {
    const { domains, userId, projectId } = params;
    if (!domains) {
      throw new CodeException({
        ...Constants.res.openCertNotFound,
        message: "域名不能为空",
      });
    }

    const userProjectQuery = this.buildUserProjectQuery(userId, projectId);
    const list = await this.find({
      select: {
        id: true,
        domains: true,
        expiresTime: true,
        pipelineId: true,
      },
      where: {
        ...userProjectQuery,
        // 只有激活状态的证书才允许被匹配使用
        status: CertStatus.active,
      },
      order: {
        id: "DESC",
      },
    });
    //遍历查找
    return list.filter(item => {
      const itemDomains = item.domains.split(",");
      return utils.domain.match(domains, itemDomains);
    });
  }

  async getCertInfoById(req: { id: number; userId: number; projectId: number; format?: string }) {
    const entity = await this.info(req.id);
    if (!entity || entity.userId !== req.userId) {
      throw new CodeException(Constants.res.openCertNotFound);
    }
    if (req.projectId && entity.projectId !== req.projectId) {
      throw new CodeException(Constants.res.openCertNotFound);
    }

    if (!entity.certInfo) {
      throw new CodeException(Constants.res.openCertNotReady);
    }
    const certInfo = JSON.parse(entity.certInfo) as CertInfo;
    const certReader = new CertReader(certInfo);
    return {
      ...certReader.toCertInfo(req.format),
      detail: {
        id: entity.id,
        domains: entity.domains.split(","),
        notAfter: certReader.expires,
      },
    };
  }

  /**
   * 流水线申请证书成功后写入证书仓库
   *
   * 每条流水线可保留多条证书记录：
   * 1. 新证书总是新建一条激活状态（active）的记录，并绑定流水线id；
   * 2. 证书来源（fromType）保持与该流水线原有记录一致（如 upload/auto）；
   * 3. 同流水线其他激活状态的证书记录被标记为未激活（inactive）；
   * 4. 顺带清理该流水线残留的空占位记录（无证书内容的历史数据）。
   */
  async updateCertByPipelineId(pipelineId: number, cert: CertInfo, fromType = "pipeline", userId?: number, projectId?: number) {
    // 查找该流水线已有的记录，用于继承来源、用户、项目信息（旧证书记录或历史占位记录）
    const anyRecord = await this.repository.findOne({
      where: { pipelineId },
      order: { id: "DESC" },
    });
    // 新证书来源保持与该流水线原有记录一致；无记录时按流水线类型推导（cert_upload=upload, cert_auto=auto）
    const pipelineType = await this.getPipelineFromType(pipelineId);
    const certFromType = anyRecord?.fromType || pipelineType || fromType;
    const certUserId = userId ?? anyRecord?.userId;
    const certProjectId = projectId ?? anyRecord?.projectId;

    const bean = await this.updateCert({
      certReader: new CertReader(cert),
      fromType: certFromType,
      userId: certUserId,
      projectId: certProjectId,
      pipelineId,
    });
    // 清理该流水线残留的空占位记录（不再维护占位证书）
    await this.repository.delete({
      pipelineId,
      certInfo: IsNull(),
      id: Not(bean.id),
    });
    // 旧证书标记为未激活
    await this.repository.update(
      {
        pipelineId,
        status: CertStatus.active,
        id: Not(bean.id),
      },
      {
        status: CertStatus.inactive,
      }
    );
    return bean;
  }

  /**
   * 根据流水线类型推导证书来源（与流水线保存逻辑保持一致）
   */
  private async getPipelineFromType(pipelineId: number): Promise<string | undefined> {
    if (!pipelineId) {
      return undefined;
    }
    const pipeline = await this.pipelineRepository.findOne({
      select: { type: true },
      where: { id: pipelineId },
    });
    if (pipeline?.type === "cert_upload") {
      return "upload";
    }
    if (pipeline?.type === "cert_auto") {
      return "auto";
    }
    return undefined;
  }

  private async updateCert(req: UploadCertReq) {
    const bean = new CertInfoEntity();
    const { id, fromType, userId, certReader } = req;
    if (id) {
      bean.id = id;
    } else {
      bean.fromType = fromType;
      // 新证书默认为激活状态
      bean.status = CertStatus.active;
    }
    const certInfo = certReader.toCertInfo();
    bean.certInfo = JSON.stringify(certInfo);
    bean.applyTime = new Date().getTime();
    const domains = certReader.detail.domains.altNames;
    bean.domains = domains.join(",");
    bean.domain = domains[0];
    bean.domainCount = domains.length;
    bean.wildcardDomainCount = this.countWildcardDomains(domains);
    bean.effectiveTime = certReader.effective;
    bean.expiresTime = certReader.expires;
    bean.certProvider = certReader.detail.issuer.commonName;
    bean.pipelineId = req.pipelineId;
    bean.userId = userId;
    bean.projectId = req.projectId;
    await this.addOrUpdate(bean);
    return bean;
  }

  /**
   * 获取流水线当前激活状态的证书记录
   */
  async getByPipelineId(pipelineId: number) {
    return await this.repository.findOne({
      where: {
        pipelineId,
        status: CertStatus.active,
      },
    });
  }

  /**
   * 吊销证书（真实调用ACME服务器吊销）
   * 仅未激活（inactive）状态的证书允许执行吊销
   */
  async revoke(id: number, userId: number, projectId?: number) {
    const entity = await this.info(id);
    if (!entity || entity.userId !== userId) {
      throw new CodeException(Constants.res.openCertNotFound);
    }
    if (projectId && entity.projectId !== projectId) {
      throw new CodeException(Constants.res.openCertNotFound);
    }
    if (entity.status !== CertStatus.inactive) {
      throw new CodeException({
        ...Constants.res.openCertNotFound,
        message: "只有未激活状态的证书才允许执行吊销",
      });
    }
    if (!entity.certInfo) {
      throw new CodeException({
        ...Constants.res.openCertNotFound,
        message: "证书数据未生成，无法吊销",
      });
    }
    const certInfo = JSON.parse(entity.certInfo) as CertInfo;

    // 从关联流水线解析证书颁发机构与ACME账号
    const { sslProvider, acmeAccount, useProxy, reverseProxy } = await this.resolveRevokeParams(entity.pipelineId, userId, projectId);
    if (!acmeAccount && !sslProvider) {
      throw new CodeException({
        ...Constants.res.openCertNotFound,
        message: "无法确定证书颁发机构（未找到关联流水线的证书申请配置），无法吊销",
      });
    }

    const acmeService = this.createAcmeService(sslProvider, { useMappingProxy: useProxy, reverseProxy });
    await acmeService.revokeCert({ cert: certInfo, acmeAccount });

    await this.repository.update(
      { id },
      {
        status: CertStatus.revoked,
        revokeTime: Date.now(),
      }
    );
  }

  /**
   * 从关联流水线的证书申请任务配置中解析吊销所需参数（sslProvider / acmeAccount / 代理配置）
   */
  private async resolveRevokeParams(pipelineId: number, userId: number, projectId?: number): Promise<{ sslProvider?: string; acmeAccount?: any; useProxy?: boolean; reverseProxy?: string }> {
    if (!pipelineId) {
      return {};
    }
    const pipeline = await this.pipelineRepository.findOne({
      where: { id: pipelineId },
    });
    if (!pipeline?.content) {
      return {};
    }
    const input = this.parseCertApplyInput(pipeline.content);
    if (!input) {
      return {};
    }
    const sslProvider: string = input.sslProvider;
    const useProxy: boolean = input.useProxy;
    const reverseProxy: string = input.reverseProxy;
    let acmeAccount = null;
    const acmeAccountAccessId = input.acmeAccountAccessId;
    if (acmeAccountAccessId) {
      const access = await this.accessService.getAccessById(acmeAccountAccessId, true, userId, projectId);
      if (access?.getAccount) {
        acmeAccount = access.getAccount();
      }
    }
    return { sslProvider, acmeAccount, useProxy, reverseProxy };
  }

  /**
   * 解析流水线配置，找到证书申请任务的输入参数
   */
  private parseCertApplyInput(pipelineContent: string): any {
    const pipeline = JSON.parse(pipelineContent);
    const stages = pipeline?.stages || [];
    for (const stage of stages) {
      const tasks = stage?.tasks || [];
      for (const task of tasks) {
        const steps = task?.steps || [];
        for (const step of steps) {
          if (step?.runnableType === "step" && step?.type && String(step.type).indexOf("CertApply") >= 0) {
            return step.input || {};
          }
        }
      }
    }
    return null;
  }

  private createAcmeService(sslProvider?: string, opts?: { useMappingProxy?: boolean; reverseProxy?: string }) {
    return new AcmeService({
      userId: 0,
      userContext: {
        getObj: async () => null,
        setObj: async () => {},
      } as any,
      logger,
      sslProvider: (sslProvider || "letsencrypt") as any,
      privateKeyType: "rsa_2048",
      maxCheckRetryCount: 20,
      domainParser: {} as any,
      useMappingProxy: opts?.useMappingProxy,
      reverseProxy: opts?.reverseProxy,
    });
  }

  async count({ userId, projectId,status }: { userId: number; projectId?: number,status?:string }) {  
    const userProjectQuery = this.buildUserProjectQuery(userId, projectId);
    const total = await this.repository.count({
      where: {
        ...userProjectQuery,
        status,
        expiresTime: Not(IsNull()),
      },
    });

    const expired = await this.repository.count({
      where: {
        ...userProjectQuery,
        status,
        expiresTime: LessThan(new Date().getTime()),
      },
    });

    const expiring = await this.repository.count({
      where: {
        ...userProjectQuery,
        status,
        expiresTime: Between(new Date().getTime(), new Date().getTime() + 15 * 24 * 60 * 60 * 1000),
      },
    });

    const notExpired = total - expired - expiring;
    return {
      total,
      expired,
      expiring,
      notExpired,
    };
  }
}
