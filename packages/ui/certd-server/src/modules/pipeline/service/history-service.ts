import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/decorator";
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../../../basic/base-service';
import { HistoryEntity } from '../entity/history';
import { PipelineEntity } from '../entity/pipeline';
import { HistoryDetail } from '../entity/vo/history-detail';
import { HistoryLogService } from './history-log-service';

/**
 * 证书申请
 */
@Provide()
@Scope(ScopeEnum.Singleton)
export class HistoryService extends BaseService<HistoryEntity> {
  @InjectEntityModel(HistoryEntity)
  repository: Repository<HistoryEntity>;
  @Inject()
  logService: HistoryLogService;
  getRepository() {
    return this.repository;
  }

  async save(bean: HistoryEntity) {
    if (bean.id > 0) {
      await this.update(bean);
    } else {
      await this.add(bean);
    }
  }

  async detail(historyId: string) {
    const entity = await this.info(historyId);
    const log = await this.logService.info(historyId);
    return new HistoryDetail(entity, log);
  }

  async start(pipeline: PipelineEntity) {
    const bean = {
      userId: pipeline.userId,
      pipelineId: pipeline.id,
      title: pipeline.title,
      status: 'start',
    };
    const { id } = await this.add(bean);
    //清除大于pipeline.keepHistoryCount的历史记录
    this.clear(pipeline.id, pipeline.keepHistoryCount);
    return id;
  }

  private async clear(pipelineId: number, keepCount = 30) {
    const count = await this.repository.count({
      where: {
        pipelineId,
      },
    });
    if (count <= keepCount) {
      return;
    }
    let shouldDeleteCount = count - keepCount;
    const deleteCountBatch = 100;
    while (shouldDeleteCount > 0) {
      const list = await this.repository.find({
        select: {
          id: true,
        },
        where: {
          pipelineId,
        },
        order: {
          id: 'ASC',
        },
        skip: 0,
        take: deleteCountBatch,
      });
      await this.repository.remove(list);

      shouldDeleteCount -= deleteCountBatch;
    }
  }
}
