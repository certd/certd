import { Config, Inject, Provide, Scope, ScopeEnum } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { In, MoreThan, Repository } from 'typeorm';
import { BaseService, PageReq } from '@certd/lib-server';
import { HistoryEntity } from '../entity/history.js';
import { PipelineEntity } from '../entity/pipeline.js';
import { HistoryDetail } from '../entity/vo/history-detail.js';
import { HistoryLogService } from './history-log-service.js';
import { FileItem, FileStore, Pipeline, RunnableCollection } from '@certd/pipeline';

import dayjs from 'dayjs';
import { DbAdapter } from '../../db/index.js';
import { logger } from '@certd/basic';

/**
 * 证书申请
 */
@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class HistoryService extends BaseService<HistoryEntity> {
  @InjectEntityModel(HistoryEntity)
  repository: Repository<HistoryEntity>;

  @InjectEntityModel(PipelineEntity)
  pipelineRepository: Repository<PipelineEntity>;
  @Inject()
  logService: HistoryLogService;

  @Inject()
  dbAdapter: DbAdapter;

  @Config('certd')
  private certdConfig: any;

  //@ts-ignore
  getRepository() {
    return this.repository;
  }

  async page(pageReq: PageReq<HistoryEntity>) {
    const res = await super.page(pageReq);
    for (const item of res.records) {
      item.fillPipelineTitle();
      delete item.pipeline;
    }
    return res;
  }

  async save(bean: HistoryEntity) {
    if (bean.id > 0) {
      await this.update(bean);
    } else {
      await this.add(bean);
    }
  }

  async detail(historyId: number) {
    const entity = await this.info(historyId);
    const log = await this.logService.info(historyId);
    return new HistoryDetail(entity, log);
  }

  async start(pipeline: PipelineEntity,triggerType:string) {
    const bean = {
      userId: pipeline.userId,
      pipelineId: pipeline.id,
      title: pipeline.title,
      status: 'start',
      triggerType,
      projectId: pipeline.projectId,
    };
    const { id } = await this.add(bean);
    //清除大于pipeline.keepHistoryCount的历史记录
    await this.clear(pipeline.id, pipeline.keepHistoryCount);
    return id;
  }

  private async clear(pipelineId: number, keepCount = 20) {
    if (pipelineId == null) {
      return;
    }
    const count = await this.repository.count({
      where: {
        pipelineId,
      },
    });
    if (count <= keepCount) {
      return;
    }
    let shouldDeleteCount = count - keepCount;
    const maxDeleteCountBatch = 100;
    // const fileStore = new FileStore({
    //   rootDir: this.certdConfig.fileRootDir,
    //   scope: pipelineId + '',
    //   parent: '0',
    // });
    while (shouldDeleteCount > 0) {
      const deleteCountBatch = maxDeleteCountBatch > shouldDeleteCount ? shouldDeleteCount : maxDeleteCountBatch;
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

      // for (const historyEntity of list) {
      //   const id = historyEntity.id;
      //   try {
      //     fileStore.deleteByParent(pipelineId + '', id + '');
      //   } catch (e) {
      //     logger.error('删除文件失败', e);
      //   }
      // }
      const ids = list.map(item => item.id);
      await this.deleteByIds(ids, null);
      shouldDeleteCount -= deleteCountBatch;
    }
  }

  async getLastHistory(pipelineId: number) {
    return await this.repository.findOne({
      where: {
        pipelineId,
      },
      order: {
        id: 'DESC',
      },
    });
  }

  async getFiles(history: HistoryEntity) {
    const status: Pipeline = JSON.parse(history.pipeline);
    const files: FileItem[] = [];
    RunnableCollection.each([status], runnable => {
      if (runnable.runnableType !== 'step') {
        return;
      }
      if (runnable.status?.files != null) {
        files.push(...runnable.status.files);
      }
    });
    return files;
  }

  async deleteByIds(ids: number[], userId: number) {
    if (!ids || ids.length === 0) {
      return;
    }
    const condition: any = {
      id: In(ids),
    };
    if (userId != null) {
      condition.userId = userId;
    }
    await this.repository.delete(condition);
    await this.logService.deleteByHistoryIds(ids);
  }

  async deleteByPipelineId(id: number) {
    if (id == null) {
      return;
    }
    await this.repository.delete({
      pipelineId: id,
    });

    try {
      const fileStore = new FileStore({
        rootDir: this.certdConfig.fileRootDir,
        scope: id + '',
        parent: '0',
      });
      fileStore.deleteByParent(id + '', '');
    } catch (e) {
      logger.error('删除文件失败', e);
    }
  }

  async countPerDay(param: { days: number; userId?: any }) {
    const todayEnd = dayjs().endOf('day');
    const where: any = {
      createTime: MoreThan(todayEnd.add(-param.days, 'day').toDate()),
    };
    if (param.userId > 0) {
      where.userId = param.userId;
    }
    const result = await this.getRepository()
      .createQueryBuilder('main')
      .select(`${this.dbAdapter.date('main.createTime')}  AS date`) // 将UNIX时间戳转换为日期
      .addSelect('COUNT(1) AS count')
      .where(where)
      .groupBy('date')
      .getRawMany();

    return result;
  }
}
