import { Controller, Inject, Post, Provide } from "@midwayjs/core";
import { BaseController, Constants } from "@certd/lib-server";
import { UserService } from "../../../modules/sys/authority/service/user-service.js";
import { RoleService } from "../../../modules/sys/authority/service/role-service.js";
import { PipelineService } from "../../../modules/pipeline/service/pipeline-service.js";
import { HistoryService } from "../../../modules/pipeline/service/history-service.js";
import { CertInfoService } from "../../../modules/monitor/index.js";
import { ApiTags } from "@midwayjs/swagger";

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
  expiringList: any[];
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

  @Post("/count", { description: Constants.per.authOnly, summary: "查询仪表盘统计数据" })
  public async count() {
    const { userId, projectId } = await this.getProjectUserIdRead();
    const pipelineCount = await this.pipelineService.count({ userId, projectId });
    const pipelineStatusCount = await this.pipelineService.statusCount({ userId, projectId });
    const pipelineEnableCount = await this.pipelineService.enableCount({ userId, projectId });

    const historyCount = await this.historyService.countPerDay({ userId, projectId, days: 7 });
    const expiringList = await this.pipelineService.latestExpiringList({ userId, projectId, count: 5 });

    const certCount = await this.certInfoService.count({ userId, projectId });

    const count: UserStatisticCount = {
      pipelineCount,
      pipelineStatusCount,
      pipelineEnableCount,
      certCount,
      historyCountPerDay: historyCount,
      expiringList,
    };
    return this.ok(count);
  }
}
