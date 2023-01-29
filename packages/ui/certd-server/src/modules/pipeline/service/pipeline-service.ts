import { Inject, Provide, Scope, ScopeEnum } from '@midwayjs/decorator';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { In, Repository } from 'typeorm';
import { BaseService } from '../../../basic/base-service';
import { PipelineEntity } from '../entity/pipeline';
import { PipelineDetail } from '../entity/vo/pipeline-detail';
import { Executor, Pipeline, RunHistory } from '@certd/pipeline';
import { AccessService } from './access-service';
import { DbStorage } from './db-storage';
import { StorageService } from './storage-service';
import { Cron } from '../../../plugins/cron/cron';
import { HistoryService } from './history-service';
import { HistoryEntity } from '../entity/history';
import { HistoryLogEntity } from '../entity/history-log';
import { HistoryLogService } from './history-log-service';
import { logger } from '../../../utils/logger';

/**
 * 证书申请
 */
@Provide()
@Scope(ScopeEnum.Singleton)
export class PipelineService extends BaseService<PipelineEntity> {
  @InjectEntityModel(PipelineEntity)
  repository: Repository<PipelineEntity>;

  @Inject()
  accessService: AccessService;
  @Inject()
  storageService: StorageService;
  @Inject()
  historyService: HistoryService;
  @Inject()
  historyLogService: HistoryLogService;

  @Inject()
  cron: Cron;

  getRepository() {
    return this.repository;
  }

  async update(entity) {
    await super.update(entity);

    await this.registerTriggerById(entity.id);
  }

  private async registerTriggerById(pipelineId) {
    if (pipelineId == null) {
      return;
    }
    const info = await this.info(pipelineId);
    if (info && !info.disabled) {
      const pipeline = JSON.parse(info.content);
      this.registerTriggers(pipeline);
    }
  }

  /**
   * 获取详情
   * @param id
   */
  async detail(id) {
    const pipeline = await this.info(id);
    return new PipelineDetail(pipeline);
  }

  async save(bean: PipelineEntity) {
    const pipeline = JSON.parse(bean.content);
    bean.title = pipeline.title;
    await this.addOrUpdate(bean);
    await this.registerTriggerById(bean.id);
  }

  /**
   * 应用启动后初始加载记录
   */
  async onStartup() {
    const idEntityList = await this.repository.find({
      select: {
        id: true,
      },
      where: {
        disabled: false,
      },
    });
    const ids = idEntityList.map(item => {
      return item.id;
    });

    //id 分段
    const idsSpan = [];
    let arr = [];
    for (let i = 0; i < ids.length; i++) {
      if (i % 20 === 0) {
        arr = [];
        idsSpan.push(arr);
      }
      arr.push(ids[i]);
    }

    //分段加载记录
    for (const idArr of idsSpan) {
      const list = await this.repository.findBy({
        id: In(idArr),
      });

      for (const entity of list) {
        const pipeline = JSON.parse(entity.content ?? '{}');
        this.registerTriggers(pipeline);
      }
    }
    logger.info('定时器数量：', this.cron.getList());
  }

  registerTriggers(pipeline?: Pipeline) {
    if (pipeline?.triggers == null) {
      return;
    }
    for (const trigger of pipeline.triggers) {
      this.registerCron(pipeline.id, trigger);
    }
  }

  async trigger(id) {
    this.cron.register({
      name: `pipeline.${id}.trigger.once`,
      cron: null,
      job: async () => {
        await this.run(id, null);
      },
    });
    logger.info('定时器数量：', this.cron.getList());
  }

  registerCron(pipelineId, trigger) {
    let cron = trigger.props?.cron;
    if (cron == null) {
      return;
    }
    if(cron.startsWith("*")){
      cron = "0"+ cron.substring(1,cron.length)
      return
    }
    this.cron.register({
      name: this.buildCronKey(pipelineId, trigger.id),
      cron: cron,
      job: async () => {
        logger.info('定时任务触发：', pipelineId, trigger.id);
        await this.run(pipelineId, trigger.id);
      },
    });
  }

  async run(id, triggerId) {
    const entity: PipelineEntity = await this.info(id);
    const pipeline = JSON.parse(entity.content);

    if (!pipeline.stages || pipeline.stages.length === 0) {
      return;
    }

    const triggerType = this.getTriggerType(triggerId, pipeline);
    if (triggerType == null) {
      return;
    }

    const onChanged = async (history: RunHistory) => {
      //保存执行历史
      await this.saveHistory(history);
    };

    const userId = entity.userId;
    const historyId = await this.historyService.start(entity);

    const executor = new Executor({
      userId,
      pipeline,
      onChanged,
      accessService: this.accessService,
      storage: new DbStorage(userId, this.storageService),
    });

    await executor.run(historyId, triggerType);
  }

  private getTriggerType(triggerId, pipeline) {
    let triggerType = 'user';
    if (triggerId != null) {
      //如果不是手动触发
      //查找trigger
      const found = this.findTrigger(pipeline, triggerId);
      if (!found) {
        //如果没有找到triggerId，说明被用户删掉了，这里再删除一次
        this.cron.remove(this.buildCronKey(pipeline.id, triggerId));
        triggerType = null;
      } else {
        logger.info('timer trigger:' + found.id, found.title, found.cron);
        triggerType = 'timer';
      }
    }
    return triggerType;
  }

  private buildCronKey(pipelineId, triggerId) {
    return `pipeline.${pipelineId}.trigger.${triggerId}`;
  }

  private findTrigger(pipeline, triggerId) {
    for (const trigger of pipeline.triggers) {
      if (trigger.id === triggerId) {
        return trigger;
      }
    }
    return;
  }

  private async saveHistory(history: RunHistory) {
    //修改pipeline状态
    const pipelineEntity = new PipelineEntity();
    pipelineEntity.id = parseInt(history.pipeline.id);
    pipelineEntity.status = history.pipeline.status.status;
    pipelineEntity.lastHistoryTime = history.pipeline.status.startTime;
    await this.update(pipelineEntity);

    const entity: HistoryEntity = new HistoryEntity();
    entity.id = parseInt(history.id);
    entity.userId = history.pipeline.userId;
    entity.pipeline = JSON.stringify(history.pipeline);
    await this.historyService.save(entity);

    const logEntity: HistoryLogEntity = new HistoryLogEntity();
    logEntity.id = entity.id;
    logEntity.userId = entity.userId;
    logEntity.pipelineId = entity.pipelineId;
    logEntity.historyId = entity.id;
    logEntity.logs = JSON.stringify(history.logs);
    await this.historyLogService.addOrUpdate(logEntity);
  }
}
