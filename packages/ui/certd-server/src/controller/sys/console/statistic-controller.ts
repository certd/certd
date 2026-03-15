import { Controller, Inject, Post, Provide } from '@midwayjs/core';
import { BaseController } from '@certd/lib-server';
import { UserService } from '../../../modules/sys/authority/service/user-service.js';
import { RoleService } from '../../../modules/sys/authority/service/role-service.js';
import { PipelineService } from '../../../modules/pipeline/service/pipeline-service.js';
import { HistoryService } from '../../../modules/pipeline/service/history-service.js';

export type ChartItem = {
  name: string;
  value: number;
};
export type SysStatisticCount = {
  userCount: number;
  pipelineCount?: number;
  historyCountPerDay: ChartItem[];
  userRegisterCountPerDay: ChartItem[];
  pipelineCreateCountPerDay: ChartItem[];
};
/**
 */
@Provide()
@Controller('/api/sys/statistic/')
export class SysStatisticController extends BaseController {
  @Inject()
  userService: UserService;
  @Inject()
  roleService: RoleService;

  @Inject()
  pipelineService: PipelineService;
  @Inject()
  historyService: HistoryService;

  @Post('/count', { description: 'sys:settings:view' })
  public async count() {
    const userCount = await this.userService.count();
    const userRegisterCountPerDay = await this.userService.registerCountPerDay({ days: 7 });
    const pipelineCreateCountPerDay = await this.pipelineService.createCountPerDay({ days: 7 });
    const pipelineCount = await this.pipelineService.count({});
    const historyCountPerDay = await this.historyService.countPerDay({ days: 7 });

    const count: SysStatisticCount = {
      userCount,
      userRegisterCountPerDay,
      pipelineCount,
      pipelineCreateCountPerDay,
      historyCountPerDay,
    };
    return this.ok(count);
  }
}
