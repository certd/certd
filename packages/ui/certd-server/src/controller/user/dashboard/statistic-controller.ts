import { Controller, Inject, Post, Provide } from "@midwayjs/core";
import { BaseController, Constants } from "@certd/lib-server";
import { UserService } from "../../../modules/sys/authority/service/user-service.js";
import { RoleService } from "../../../modules/sys/authority/service/role-service.js";
import { PipelineService } from "../../../modules/pipeline/service/pipeline-service.js";
import { HistoryService } from "../../../modules/pipeline/service/history-service.js";
import { CertInfoService, CertStatus } from "../../../modules/monitor/index.js";
import { SiteInfoService } from "../../../modules/monitor/service/site-info-service.js";
import { DomainService } from "../../../modules/cert/service/domain-service.js";
import { Between, LessThan } from "typeorm";
import { ApiTags } from "@midwayjs/swagger";
import { UserSettingsService } from "../../../modules/mine/service/user-settings-service.js";
import { UserStatisticSetting } from "../../../modules/mine/service/models.js";

export type ChartItem = {
  name: string;
  value: number;
};
export type UserStatisticCount = {
  pipelineCount?: number;
  pipelineStatusCount?: ChartItem[];
  pipelineEnableCount?: {
    enabled: number;
    disabled: number;
  };
  historyCountPerDay: ChartItem[];
  certCount?: {
    total: number;
    expired: number;
    expiring: number;
    notExpired: number;
  };
  siteCount?: {
    total: number;
    abnormal: number;
    normal: number;
  };
  domainCount?: {
    total: number;
    expired: number;
    expiring: number;
    notExpired: number;
  };
  expiringList: any[];
  genCertCount: {
    singleDomainCertCount: number;
    multiDomainCertCount: number;
    wildcardCertCount: number;
    totalPipelineRuns: number;
  };
};
/**
 */
@Provide()
@Controller("/api/statistic/")
@ApiTags(["dashboard"])
export class StatisticController extends BaseController {
  @Inject()
  userService: UserService;
  @Inject()
  roleService: RoleService;

  @Inject()
  pipelineService: PipelineService;
  @Inject()
  historyService: HistoryService;

  @Inject()
  certInfoService: CertInfoService;

  @Inject()
  siteInfoService: SiteInfoService;

  @Inject()
  domainService: DomainService;

  @Inject()
  userSettingsService: UserSettingsService;

  @Post("/count", { description: Constants.per.authOnly, summary: "查询仪表盘统计数据" })
  public async count() {
    const { userId, projectId } = await this.getProjectUserIdRead();
    const pipelineCount = await this.pipelineService.count({ userId, projectId });
    const pipelineStatusCount = await this.pipelineService.statusCount({ userId, projectId });
    const pipelineEnableCount = await this.pipelineService.enableCount({ userId, projectId });

    const historyCount = await this.historyService.countPerDay({ userId, projectId, days: 7 });
    const expiringList = await this.pipelineService.latestExpiringList({ userId, projectId, count: 5 });

    const certCount = await this.certInfoService.count({ userId, projectId, status: CertStatus.active });
    const now = Date.now();
    const oneMonthLater = now + 30 * 24 * 60 * 60 * 1000;
    const userProjectQuery = this.siteInfoService.buildUserProjectQuery(userId, projectId);
    const siteTotal = await this.siteInfoService.repository.count({ where: userProjectQuery });
    const siteAbnormal = await this.siteInfoService.repository.count({
      where: { ...userProjectQuery, checkStatus: "error" },
    });
    const domainProjectQuery = this.domainService.buildUserProjectQuery(userId, projectId);
    const domainTotal = await this.domainService.repository.count({ where: domainProjectQuery });
    const domainExpired = await this.domainService.repository.count({
      where: { ...domainProjectQuery, expirationDate: LessThan(now) },
    });
    const domainExpiring = await this.domainService.repository.count({
      where: { ...domainProjectQuery, expirationDate: Between(now, oneMonthLater) },
    });
    const rawUserStatistic = await this.userSettingsService.getSetting<UserStatisticSetting>(userId, projectId, UserStatisticSetting);
    const userStatistic = this.userSettingsService.normalizeStatisticSetting(rawUserStatistic);

    const count: UserStatisticCount = {
      pipelineCount,
      pipelineStatusCount,
      pipelineEnableCount,
      certCount,
      siteCount: { total: siteTotal, abnormal: siteAbnormal, normal: siteTotal - siteAbnormal },
      domainCount: { total: domainTotal, expired: domainExpired, expiring: domainExpiring, notExpired: domainTotal - domainExpired - domainExpiring },
      historyCountPerDay: historyCount,
      expiringList,
      genCertCount: {
        singleDomainCertCount: Number(userStatistic.genCertCount.singleDomainCertCount) || 0,
        multiDomainCertCount: Number(userStatistic.genCertCount.multiDomainCertCount) || 0,
        wildcardCertCount: Number(userStatistic.genCertCount.wildcardCertCount) || 0,
        totalPipelineRuns: Number(userStatistic.genCertCount.totalPipelineRuns) || 0,
      },
    };
    return this.ok(count);
  }
}
