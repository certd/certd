import { IServiceGetter } from "@certd/pipeline";
import { ApplicationContext, IMidwayContainer, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { AccessGetter, AccessService } from "@certd/lib-server";
import { CnameProxyService } from "./cname-proxy-service.js";
import { NotificationGetter } from "./notification-getter.js";
import { NotificationService } from "../notification-service.js";
import { CnameRecordService } from "../../../cname/service/cname-record-service.js";
import { SubDomainsGetter } from "./sub-domain-getter.js";
import { DomainVerifierGetter } from "./domain-verifier-getter.js";
import { DomainService } from "../../../cert/service/domain-service.js";
import { SubDomainService } from "../sub-domain-service.js";
import { CertInfoGetter } from "./cert-info-getter.js";
import { CertInfoService } from "../../../monitor/index.js";
import { ICertInfoGetter } from "@certd/plugin-lib";
import { CnameProviderService } from "../../../cname/service/cname-provider-service.js";

const serviceNames = ["ocrService"];
export class TaskServiceGetter implements IServiceGetter {
  private userId: number;
  private projectId: number;
  private appCtx: IMidwayContainer;
  constructor(userId: number, projectId: number, appCtx: IMidwayContainer) {
    this.userId = userId;
    this.projectId = projectId;
    this.appCtx = appCtx;
  }
  async get<T>(serviceName: string): Promise<T> {
    if (serviceName === "subDomainsGetter") {
      return (await this.getSubDomainsGetter()) as T;
    }
    if (serviceName === "accessService") {
      return (await this.getAccessService()) as T;
    } else if (serviceName === "cnameProxyService") {
      return (await this.getCnameProxyService()) as T;
    } else if (serviceName === "notificationService") {
      return (await this.getNotificationService()) as T;
    } else if (serviceName === "domainVerifierGetter") {
      return (await this.getDomainVerifierGetter()) as T;
    } else if (serviceName === "certInfoGetter") {
      return (await this.getCertInfoGetter()) as T;
    } else {
      if (!serviceNames.includes(serviceName)) {
        throw new Error(`${serviceName} not in whitelist`);
      }
      const service = await this.appCtx.getAsync(serviceName);
      if (!service) {
        throw new Error(`${serviceName} not found`);
      }
    }
  }

  async getSubDomainsGetter(): Promise<SubDomainsGetter> {
    const subDomainsService: SubDomainService = await this.appCtx.getAsync("subDomainService");
    const domainService: DomainService = await this.appCtx.getAsync("domainService");
    const cnameProviderService: CnameProviderService = await this.appCtx.getAsync("cnameProviderService");
    return new SubDomainsGetter(this.userId, this.projectId, subDomainsService, domainService, cnameProviderService);
  }

  async getCertInfoGetter(): Promise<ICertInfoGetter> {
    const certInfoService: CertInfoService = await this.appCtx.getAsync("certInfoService");
    return new CertInfoGetter(this.userId, this.projectId, certInfoService);
  }

  async getAccessService(): Promise<AccessGetter> {
    const accessService: AccessService = await this.appCtx.getAsync("accessService");
    return new AccessGetter(this.userId, this.projectId, accessService.getById.bind(accessService));
  }

  async getCnameProxyService(): Promise<CnameProxyService> {
    const cnameRecordService: CnameRecordService = await this.appCtx.getAsync("cnameRecordService");
    return new CnameProxyService(this.userId, this.projectId, cnameRecordService.getWithAccessByDomain.bind(cnameRecordService));
  }

  async getNotificationService(): Promise<NotificationGetter> {
    const notificationService: NotificationService = await this.appCtx.getAsync("notificationService");
    return new NotificationGetter(this.userId, this.projectId, notificationService);
  }

  async getDomainVerifierGetter(): Promise<DomainVerifierGetter> {
    const domainService: DomainService = await this.appCtx.getAsync("domainService");
    return new DomainVerifierGetter(this.userId, this.projectId, domainService);
  }
}
@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class TaskServiceBuilder {
  @ApplicationContext()
  appCtx: IMidwayContainer;

  create(req: TaskServiceCreateReq) {
    const userId = req.userId;
    const projectId = req.projectId;
    return new TaskServiceGetter(userId, projectId, this.appCtx);
  }
}

export type TaskServiceCreateReq = {
  userId: number;
  projectId?: number;
};
