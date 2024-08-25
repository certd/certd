import { Config, Inject, Provide, Scope, ScopeEnum } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { In, Repository } from 'typeorm';
import { BaseService } from '../../../basic/base-service.js';
import { HistoryEntity } from '../entity/history.js';
import { PipelineEntity } from '../entity/pipeline.js';
import { HistoryDetail } from '../entity/vo/history-detail.js';
import { HistoryLogService } from './history-log-service.js';
import { FileItem, Pipeline, RunnableCollection } from '@certd/pipeline';
import { FileStore } from '@certd/pipeline';
import { logger } from '../../../utils/logger.js';

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

  @Config('certd')
  private certdConfig: any;

  getRepository() {
    return this.repository;
  }

  async page(query, page, sort, buildQuery) {
    const res = await super.page(query, page, sort, buildQuery);
    for (const item of res.records) {
      item.fillPipelineTitle();
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
    await this.clear(pipeline.id, pipeline.keepHistoryCount);
    return id;
  }

  private async clear(pipelineId: number, keepCount = 20) {
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
}
