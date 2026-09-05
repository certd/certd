import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { AccessService, BaseService, CodeException, Constants, PageReq } from "@certd/lib-server";
import { InjectEntityModel } from "@midwayjs/typeorm";
import { Between, In, IsNull, LessThan, Not, Or, Repository } from "typeorm";
import { CertInfoEntity, CertStatus } from "../entity/cert-info.js";
import { logger, utils } from "@certd/basic";
import { CertInfo, CertReader } from "@certd/plugin-cert";
import { AcmeService } from "../../../plugins/plugin-cert/plugin/cert-plugin/acme.js";
import { PipelineEntity } from "../../pipeline/entity/pipeline.js";
import { UserSettingsService } from "../../mine/service/user-settings-service.js";

export type UploadCertReq = {
  id?: number;
  certReader: CertReader;
  fromType?: string;
  userId?: number;
  projectId?: number;
  pipelineId?: number;
  taskId?: string;
  acmeAccountAccessId?: number;
};

/**
 * 流水线中的证书申请任务信息（保存流水线时同步证书仓库用）
 */
export type ApplyTaskInfo = {
  taskId: string;
  domains: string[];
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

  @Inject()
  userSettingsService: UserSettingsService;

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

  async getMatchCertList(params: { domains: string[]; userId: number; projectId?: number; pipelineId?: number }) {
    const { domains, userId, projectId, pipelineId } = params;
    if (!domains) {
      throw new CodeException({
        ...Constants.res.openCertNotFound,
        message: "域名不能为空",
      });
    }

    const userProjectQuery = this.buildUserProjectQuery(userId, projectId);
    if (pipelineId) {
      userProjectQuery.pipelineId = pipelineId;
    }
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
   * 1. 【重要】若该流水线存在空证书记录（certInfo 为空、由保存流水线时 updateDomains 创建的占位记录），
   *    直接更新这条占位记录写入证书内容，不要新建一条——占位记录是开放接口（OpenAPI autoApply）
   *    判断“是否已申请过”的依据，必须保留，更新它既能复用记录又保持记录数不变；
   * 2. 没有占位记录时，新证书新建一条激活状态（active）的记录，并绑定流水线id与申请任务id；
   * 3. 证书来源（fromType）保持与该流水线原有记录一致（如 upload/auto）；
   * 4. 同流水线、同申请任务的其他激活状态的证书记录被标记为未激活（inactive）。
   */
  async updateCertByPipelineId(pipelineId: number, cert: CertInfo, fromType?: string, taskId?: string) {
    const pipeline = await this.pipelineRepository.findOne({
      where: { id: pipelineId },
    });

    if (!pipeline) {
      throw new CodeException(Constants.res.openCertNotFound);
    }

    // 查找该流水线已有的记录，用于继承来源、用户、项目信息（旧证书记录或历史占位记录）
    const anyRecord = await this.repository.findOne({
      where: { pipelineId },
      order: { id: "DESC" },
    });
    // 新证书来源保持与该流水线原有记录一致；无记录时按流水线类型推导（cert_upload=upload, cert_auto=auto）
    const pipelineType = await this.getPipelineFromType(pipelineId);
    const certFromType = anyRecord?.fromType || pipelineType || fromType;
    const certUserId = pipeline?.userId;
    const certProjectId = pipeline?.projectId;

    // 查找该流水线的空证书记录（占位记录，certInfo 为空）：存在则直接更新它，不新建记录
    const placeholderRecord = await this.repository.findOne({
      where: {
        pipelineId,
        taskId: taskId ?? IsNull(),
        certInfo: IsNull(),
        ...this.buildUserProjectQuery(certUserId, certProjectId),
      },
      order: { id: "DESC" },
    });

    // 解析ACME账号授权id，随证书记录落库：吊销旧证书时直接读表，无需再解析流水线
    const acmeAccountAccessId = this.parseAcmeAccountAccessId(pipeline);

    const bean = await this.updateCert({
      certReader: new CertReader(cert),
      fromType: certFromType,
      userId: certUserId,
      projectId: certProjectId,
      pipelineId,
      taskId,
      id: placeholderRecord?.id,
      acmeAccountAccessId,
    });
    // 旧证书标记为未激活（仅同申请任务产出的旧证书，避免误伤其他任务仍在使用的证书）
    await this.repository.update(
      {
        pipelineId,
        status: CertStatus.active,
        id: Not(bean.id),
        taskId: taskId ?? IsNull(),
      },
      {
        status: CertStatus.inactive,
      }
    );
    if (certUserId != null) {
      const domains = cert?.crt ? new CertReader(cert).getAltNames() : [];
      const wildcardCount = domains.filter(domain => String(domain).trim().toLowerCase().startsWith("*.")).length;
      const field = wildcardCount > 0 ? "genCertCount.wildcardCertCount" : domains.length > 1 ? "genCertCount.multiDomainCertCount" : "genCertCount.singleDomainCertCount";
      await this.userSettingsService.incrementStatistic(certUserId, certProjectId, field);
    }
    return bean;
  }

  /**
   * 保存流水线时同步证书仓库的 active 记录（占位记录，certInfo 为空）
   *
   * 【重要，不要删除】仓库中的 active 记录是开放接口（OpenAPI autoApply）判断“该域名是否已申请过”的依据：
   * 开放接口触发申请证书前，会先查询证书仓库中是否有该流水线的记录——有记录（即使证书内容为空）
   * 说明该流水线已存在、证书正在申请中，直接复用/触发已有流水线，而不是再创建一条新的。
   * 若没有这些记录，在证书申请成功前的空窗期内，开放接口每次调用都会重复创建新流水线。
   *
   * 同步规则（只处理 active 记录，inactive/revoked 历史保留不动）：
   * 1. 流水线中每个证书申请任务（CertApply 类步骤）对应仓库中一条 active 记录（按 taskId 关联）：
   *    - 已有 active 记录（可能是空证书记录或最新申请的真证书）→ 更新域名信息，保持 active；
   *    - 没有 → 创建一条空证书记录（active）。
   * 2. 删除孤儿记录：流水线中已不存在对应申请任务 id 的 active 记录（任务被删除/替换后残留），
   *    避免仓库中留下找不到来源的 active 记录；历史 inactive/revoked 记录不删。
   */
  async updateDomains(pipelineId: number, userId: number, projectId: number, applyTasks: ApplyTaskInfo[], fromType?: string) {
    if (!applyTasks || applyTasks.length === 0) {
      //流水线没有证书申请任务：删除该流水线所有 active 记录（占位记录由申请任务维护，任务没了记录一并清理）
      await this.repository.delete({
        pipelineId,
        ...this.buildUserProjectQuery(userId, projectId),
        status: CertStatus.active,
      });
      return;
    }
    const userProjectQuery = this.buildUserProjectQuery(userId, projectId);
    const taskIds = applyTasks.map(task => task.taskId);

    const foundHistory = await this.repository.find({
      where: {
        pipelineId,
        status: CertStatus.active,
        ...userProjectQuery,
      },
    });

    for (const task of applyTasks) {
      // 每个申请任务维护一条 active 记录（不重复创建，最新真证书申请成功后旧记录会被标记为 inactive）
      const bean = new CertInfoEntity();
      let found = foundHistory.find(item => item.taskId === task.taskId);
      if (!found && foundHistory.length == 1 && applyTasks.length == 1) {
        found = foundHistory[0];
      }
      if (found) {
        //已有 active 记录（空占位或真证书）：更新域名信息
        bean.id = found.id;
        if (!found.taskId) {
          bean.taskId = task.taskId;
        }
      } else {
        //创建空证书记录
        bean.pipelineId = pipelineId;
        bean.userId = userId;
        bean.projectId = projectId;
        bean.fromType = fromType;
        bean.taskId = task.taskId;
        bean.status = CertStatus.active;
      }
      const taskDomains = task.domains || [];
      bean.domain = taskDomains[0] || "";
      bean.domains = taskDomains.join(",");
      bean.domainCount = taskDomains.length;
      bean.wildcardDomainCount = this.countWildcardDomains(taskDomains);
      await this.addOrUpdate(bean);
    }
    // 删除孤儿 active 记录：流水线中已不存在的申请任务（含历史遗留 taskId 为空的 active 记录）
    await this.repository.delete({
      pipelineId,
      ...userProjectQuery,
      status: CertStatus.active,
      taskId: Or(IsNull(), Not(In(taskIds))),
    });
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
      // 更新已有记录（如空证书记录占位被申请成功复用）：写入新证书内容后该记录应为激活状态
      bean.id = id;
      bean.status = CertStatus.active;
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
    bean.taskId = req.taskId;
    bean.userId = userId;
    bean.projectId = req.projectId;
    // 吊销旧证书时直接使用记录上的ACME账号授权id（无需再解析流水线）
    bean.acmeAccountAccessId = req.acmeAccountAccessId;
    await this.addOrUpdate(bean);
    return bean;
  }

  /**
   * 从流水线配置中解析证书申请任务使用的ACME账号授权id（写入证书记录，吊销时读表使用）
   */
  private parseAcmeAccountAccessId(pipeline?: PipelineEntity): number | undefined {
    if (!pipeline?.content) {
      return undefined;
    }
    const input = this.parseCertApplyInput(pipeline.content);
    return input?.acmeAccountAccessId;
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

    // 优先使用证书记录上保存的ACME账号授权id（吊销不再解析流水线）；旧数据没有该字段时回退解析流水线
    const { sslProvider, acmeAccount, useProxy, reverseProxy } = await this.resolveRevokeParamsWithEntity(entity, userId, projectId);
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
   * 解析吊销所需参数（sslProvider / acmeAccount / 代理配置）
   *
   * 优先使用证书记录上保存的 acmeAccountAccessId 直接取ACME账号（无需查询流水线）；
   * 记录上没有该字段（旧数据或非ACME来源）时，回退到从流水线配置解析（旧版兼容）。
   */
  private async resolveRevokeParamsWithEntity(entity: CertInfoEntity, userId: number, projectId?: number): Promise<{ sslProvider?: string; acmeAccount?: any; useProxy?: boolean; reverseProxy?: string }> {
    if (entity.acmeAccountAccessId) {
      const access = await this.accessService.getAccessById(entity.acmeAccountAccessId, true, userId, projectId);
      if (access?.getAccount) {
        const acmeAccount = access.getAccount();
        return {
          sslProvider: acmeAccount?.caType,
          acmeAccount,
          useProxy: undefined,
          reverseProxy: undefined,
        };
      }
    }
    return this.resolveRevokeParams(entity.pipelineId, userId, projectId);
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

  async count({ userId, projectId, status }: { userId: number; projectId?: number; status?: string }) {
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
