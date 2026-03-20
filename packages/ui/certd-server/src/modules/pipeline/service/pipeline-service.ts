import { Config, Inject, Provide, Scope, ScopeEnum, sleep } from "@midwayjs/core";
import { InjectEntityModel } from "@midwayjs/typeorm";
import { In, MoreThan, Repository } from "typeorm";
import {
  AccessService,
  BaseService,
  isEnterprise,
  NeedSuiteException,
  NeedVIPException,
  PageReq,
  SysPublicSettings,
  SysSettingsService,
  SysSiteInfo
} from "@certd/lib-server";
import { PipelineEntity } from "../entity/pipeline.js";
import { PipelineDetail } from "../entity/vo/pipeline-detail.js";
import {
  Executor,
  IAccessService,
  ICnameProxyService,
  INotificationService, Notification,
  Pipeline,
  pluginRegistry,
  ResultType,
  RunHistory,
  RunnableCollection,
  SysInfo,
  UserInfo
} from "@certd/pipeline";
import { DbStorage } from "./db-storage.js";
import { StorageService } from "./storage-service.js";
import { Cron } from "../../cron/cron.js";
import { HistoryService } from "./history-service.js";
import { HistoryEntity } from "../entity/history.js";
import { HistoryLogEntity } from "../entity/history-log.js";
import { HistoryLogService } from "./history-log-service.js";
import { EmailService } from "../../basic/service/email-service.js";
import { UserService } from "../../sys/authority/service/user-service.js";
import { CnameRecordService } from "../../cname/service/cname-record-service.js";
import { PluginConfigGetter } from "../../plugin/service/plugin-config-getter.js";
import dayjs from "dayjs";
import { DbAdapter } from "../../db/index.js";
import { checkPlus, isComm, isPlus } from "@certd/plus-core";
import { logger, utils } from "@certd/basic";
import { UrlService } from "./url-service.js";
import { NotificationService } from "./notification-service.js";
import { UserSuiteEntity, UserSuiteService } from "@certd/commercial-core";
import { CertInfoService } from "../../monitor/service/cert-info-service.js";
import { TaskServiceBuilder } from "./getter/task-service-getter.js";
import { nanoid } from "nanoid";
import { set } from "lodash-es";
import { executorQueue } from "@certd/lib-server";
import parser from "cron-parser";
import { ProjectService } from "../../sys/enterprise/service/project-service.js";
const runningTasks: Map<string | number, Executor> = new Map();


/**
 * 证书申请
 */
@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class PipelineService extends BaseService<PipelineEntity> {
  @InjectEntityModel(PipelineEntity)
  repository: Repository<PipelineEntity>;
  @Inject()
  emailService: EmailService;
  @Inject()
  accessService: AccessService;
  @Inject()
  cnameRecordService: CnameRecordService;
  @Inject()
  storageService: StorageService;
  @Inject()
  historyService: HistoryService;
  @Inject()
  historyLogService: HistoryLogService;

  @Inject()
  pluginConfigGetter: PluginConfigGetter;

  @Inject()
  taskServiceBuilder: TaskServiceBuilder;

  @Inject()
  sysSettingsService: SysSettingsService;

  @Inject()
  userService: UserService;

  @Inject()
  userSuiteService: UserSuiteService;

  @Inject()
  cron: Cron;

  @Config("certd")
  private certdConfig: any;

  @Inject()
  urlService: UrlService;

  @Inject()
  notificationService: NotificationService;

  @Inject()
  dbAdapter: DbAdapter;

  @Inject()
  certInfoService: CertInfoService;

  @Inject()
  projectService: ProjectService;

  //@ts-ignore
  getRepository() {
    return this.repository;
  }

  async add(bean: PipelineEntity) {
    bean.status = ResultType.none;
    if (bean.order == null) {
      bean.order = 0;
    }
    await this.save(bean);
    return bean;
  }

  async page(pageReq: PageReq<PipelineEntity>) {
    //模版流水线不要被查询出来
    set(pageReq, "query.isTemplate", false);
    const result = await super.page(pageReq);
    await this.fillLastVars(result.records);

    for (const item of result.records) {
      if (!item.content) {
        continue;
      }
      const pipeline = JSON.parse(item.content);
      let stepCount = 0;
      if (pipeline.stages) {
        RunnableCollection.each(pipeline.stages, (runnable: any) => {
          if (runnable.runnableType === "step") {
            stepCount++;
          }
        });
      }
      // @ts-ignore
      item.stepCount = stepCount;
      if (item.triggerCount == 0) {
        item.triggerCount = pipeline.triggers?.length;
      }

      //获取下次执行时间
      if (pipeline.triggers?.length > 0) {
        const triggers = pipeline.triggers.filter((item) => item.type === 'timer');
        if (triggers && triggers.length > 0) {
          let nextTimes: any = [];
          for (const item of triggers) {
            if (!item.props?.cron) {
              continue;
            }
            const ret = this.getCronNextTimes(item.props?.cron, 1);
            nextTimes.push(...ret);
          }
          item.nextRunTime = nextTimes[0]
        }

      }

      delete item.content;
    }

    return result;
  }

  getCronNextTimes(cron: string, count: number = 1) {
    if (cron == null) {
      return [];
    }
    const nextTimes = [];
    const interval = parser.parseExpression(cron);
    for (let i = 0; i < count; i++) {
      const next = interval.next().getTime();
      nextTimes.push(dayjs(next).format("YYYY-MM-DD HH:mm:ss"));
    }
    return nextTimes;
  }


  private async fillLastVars(records: PipelineEntity[]) {
    const pipelineIds: number[] = [];
    const recordMap = {};
    for (const record of records) {
      pipelineIds.push(record.id);
      recordMap[record.id] = record;
      record.title = record.title + "";
    }
    if (pipelineIds?.length > 0) {
      const vars = await this.storageService.findPipelineVars(pipelineIds);
      for (const varEntity of vars) {
        const record = recordMap[varEntity.namespace];
        if (record) {
          const value = JSON.parse(varEntity.value);
          record.lastVars = value.value;
        }
      }
    }
  }

  public async registerTriggerById(pipelineId) {
    if (pipelineId == null) {
      return;
    }
    const info = await this.info(pipelineId);
    if (!info) {
      return;
    }
    if (!info.disabled) {
      const pipeline = JSON.parse(info.content);
      this.registerTriggers(pipeline, false);
    } else {
      this.unregisterTriggers(info);
    }
  }

  public async registerTrigger(info: PipelineEntity) {
    if (info == null) {
      return;
    }
    if (info && !info.disabled) {
      const pipeline = JSON.parse(info.content);
      this.registerTriggers(pipeline, false);
    }
  }



  /**
   * 获取详情
   * @param id
   */
  async detail(id) {
    const pipeline = await this.info(id);
    await this.fillLastVars([pipeline]);
    return new PipelineDetail(pipeline);
  }

  async update(bean: Partial<PipelineEntity>) {
    //更新非trigger部分
    await super.update(bean);
  }

  async save(bean: PipelineEntity) {
    let old = null;
    if (bean.id > 0) {
      //修改
      old = await this.info(bean.id);
      bean.order = old.order;
      bean.userId = old.userId;
      bean.projectId = old.projectId;
    }
    if (!old || !old.webhookKey) {
      bean.webhookKey = await this.genWebhookKey();
    }

    const isUpdate = bean.id > 0 && old != null;


    const pipeline = JSON.parse(bean.content || "{}");
    RunnableCollection.initPipelineRunnableType(pipeline);
    pipeline.userId = bean.userId;
    pipeline.projectId = bean.projectId;
    let domains = [];
    if (pipeline.stages) {
      RunnableCollection.each(pipeline.stages, (runnable: any) => {
        if (runnable.runnableType === "step" && runnable.type.indexOf("CertApply") >= 0) {
          domains = runnable.input.domains || [];
        }
      });
    }

    if (!isUpdate) {
      //如果是添加，校验数量
      await this.checkMaxPipelineCount(bean, pipeline, domains);
    }

    if (!bean.status) {
      bean.status = ResultType.none;
    }
    if (bean.order == null) {
      bean.order = 0;
    }
    if (!isUpdate) {
      //如果是添加，先保存一下，获取到id，更新pipeline.id
      await this.addOrUpdate(bean);
    }

    await this.doUpdatePipelineJson(bean, pipeline);
    //保存域名信息到certInfo表
    let fromType = "pipeline";
    if (bean.type === "cert_upload") {
      fromType = "upload";
    } else if (bean.type === "cert_auto") {
      fromType = "auto";
    }
    const userId = bean.userId;
    const projectId = bean.projectId ?? null;
    await this.certInfoService.updateDomains(pipeline.id, userId, projectId, domains, fromType);
    return {
      ...bean,
      version: pipeline.version,
    };
  }

  /**
   * 更新Pipeline， 包括trigger
   * @param bean
   * @param pipeline
   */
  async doUpdatePipelineJson(bean: PipelineEntity, pipeline: Pipeline) {
    await this.unregisterTriggers(bean);
    if (pipeline.title) {
      bean.title = pipeline.title;
    }
    pipeline.id = bean.id;

    if (pipeline.version == null) {
      pipeline.version = 0;
    }
    pipeline.version++;

    bean.triggerCount = pipeline.triggers?.filter((trigger) => trigger.type === "timer").length || 0;

    bean.content = JSON.stringify(pipeline);
    await this.addOrUpdate(bean);
    await this.registerTrigger(bean);
    return bean
  }

  private async checkMaxPipelineCount(bean: PipelineEntity, pipeline: Pipeline, domains: string[]) {
    // if (!isPlus()) {
    //   const count = await this.repository.count();
    //   if (count >= freeCount) {
    //     throw new NeedVIPException(`基础版最多只能创建${freeCount}条流水线`);
    //   }
    // }
    if (isEnterprise()) {
      //企业模式不限制
      checkPlus()
      return;
    }

    if (isComm()) {
      //校验pipelineCount
      const suiteSetting = await this.userSuiteService.getSuiteSetting();
      if (suiteSetting.enabled) {
        const userSuite = await this.userSuiteService.getMySuiteDetail(bean.userId);
        if (userSuite?.pipelineCount.max != -1 && userSuite?.pipelineCount.used + 1 > userSuite?.pipelineCount.max) {
          throw new NeedSuiteException(`对不起，您最多只能创建${userSuite?.pipelineCount.max}条流水线，请购买或升级套餐`);
        }

        if (userSuite.domainCount.max != -1 && userSuite.domainCount.used + domains.length > userSuite.domainCount.max) {
          throw new NeedSuiteException(`对不起，您最多只能添加${userSuite.domainCount.max}个域名，请购买或升级套餐`);
        }
      }
    } else {
      //非商业版校验用户最大流水线数量
      const userId = bean.userId;
      const userIsAdmin = await this.userService.isAdmin(userId);
      if (!userIsAdmin) {
        //非管理员用户，限制pipeline数量
        const count = await this.repository.count({ where: { userId } });
        const sysPublic = await this.sysSettingsService.getSetting<SysPublicSettings>(SysPublicSettings);
        const limitUserPipelineCount = sysPublic.limitUserPipelineCount;
        if (limitUserPipelineCount && limitUserPipelineCount > 0 && count >= limitUserPipelineCount) {
          throw new NeedVIPException(`普通用户最多只能创建${limitUserPipelineCount}条流水线`);
        }
      }
    }

  }

  async foreachPipeline(callback: (pipeline: PipelineEntity) => void) {
    const idEntityList = await this.repository.find({
      select: {
        id: true
      },
      where: {
        disabled: false,
        isTemplate: false
      }
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
        id: In(idArr)
      });

      for (const entity of list) {
        await callback(entity);
      }
    }
  }

  async stopOtherUserPipeline(userId: number) {
    await this.foreachPipeline(async entity => {
      if (entity.userId !== userId) {
        await this.unregisterTriggers(entity.id);
      }
    });
  }

  /**
   * 应用启动后初始加载记录
   */
  async onStartup(immediateTriggerOnce: boolean, onlyAdminUser: boolean) {
    await this.foreachPipeline(async entity => {
      if (onlyAdminUser && entity.userId !== 1) {
        return;
      }
      const pipeline = JSON.parse(entity.content ?? "{}");
      try {
        await this.registerTriggers(pipeline, immediateTriggerOnce);
      } catch (e) {
        logger.error("加载定时trigger失败：", e);
      }
    });
    logger.info("定时器数量：", this.cron.getTaskSize());
  }

  async registerTriggers(pipeline?: Pipeline, immediateTriggerOnce = false) {
    if (pipeline?.triggers == null) {
      return;
    }
    for (const trigger of pipeline.triggers) {
      this.registerCron(pipeline.id, pipeline.userId, trigger);
    }

    if (immediateTriggerOnce) {
      try {
        await this.trigger(pipeline.id);
        await sleep(200);
      } catch (e) {
        logger.error(e);
      }

    }
  }



  async trigger(id: any, stepId?: string, doCheck = false) {
    const entity: PipelineEntity = await this.info(id);
    if (doCheck) {
      await this.beforeCheck(entity);
    }
    this.cron.register({
      name: `pipeline.${id}.trigger.once`,
      cron: null,
      job: async () => {
        logger.info("用户手动启动job");
        try {
          await this.doRun(entity, null, stepId);
        } catch (e) {
          logger.error("手动job执行失败：", e);
        }
      }
    });
  }

  async checkHasDeployCount(pipelineId: number, userId: number) {
    try {
      return await this.userSuiteService.checkHasDeployCount(userId);
    } catch (e) {
      if (e instanceof NeedSuiteException) {
        logger.error(e.message);
        await this.update({
          id: pipelineId,
          status: "no_deploy_count"
        });
      }
      throw e;
    }
  }

  //@ts-ignore
  async delete(id: any) {
    await this.unregisterTriggers(id);
    //TODO 删除storage
    // const storage = new DbStorage(pipeline.userId, this.storageService);
    // await storage.remove(pipeline.id);
    await super.delete([id]);
    await this.historyService.deleteByPipelineId(id);
    await this.historyLogService.deleteByPipelineId(id);
    await this.certInfoService.deleteByPipelineId(id);
  }

  async unregisterTriggers(id: number | PipelineEntity) {
    if (id == null) {
      return;
    }
    let pipeline: PipelineEntity = null;
    if (typeof id === "number") {
      pipeline = await this.info(id);
    } else {
      pipeline = id;
      id = pipeline.id;
    }
    if (!pipeline) {
      return;
    }
    const pipelineObj = JSON.parse(pipeline.content);
    if (pipelineObj.triggers) {
      for (const trigger of pipelineObj.triggers) {
        this.removeCron(id, trigger);
      }
    }
  }

  removeCron(pipelineId, trigger) {
    const name = this.buildCronKey(pipelineId, trigger.id);
    this.cron.remove(name);
    logger.info("当前定时器数量：", this.cron.getTaskSize());
  }

  registerCron(pipelineId: number, userId: number, trigger) {
    if (pipelineId == null) {
      logger.warn("pipelineId为空，无法注册定时任务");
      return;
    }

    let cron = trigger.props?.cron;
    if (cron == null) {
      return;
    }
    cron = cron.trim();
    if (cron.startsWith("* * ")) {
      cron = "0 0 " + cron.substring(5);
    }
    if (cron.startsWith("* ")) {
      cron = "0 " + cron.substring(2);
    }
    const triggerId = trigger.id;
    const name = this.buildCronKey(pipelineId, triggerId);
    this.cron.remove(name);
    this.cron.register({
      name,
      cron,
      job: async () => {
        logger.info("定时任务触发：", pipelineId, triggerId);
        if (pipelineId == null) {
          logger.warn("pipelineId为空,无法执行");
          return;
        }
        //加入执行队列
        executorQueue.addTask(userId, {
          task: async () => {
            try {
              await this.run(pipelineId, triggerId);
            } catch (e) {
              logger.error("定时job执行失败：", e);
            }
          }
        });
      }
    });
    logger.info("当前定时器数量：", this.cron.getTaskSize());
  }


  async isPipelineValidTimeEnabled(entity: PipelineEntity) {
    const settings = await this.sysSettingsService.getPublicSettings();
    if (isPlus() && settings.pipelineValidTimeEnabled) {
      if (entity.validTime > 0 && entity.validTime < Date.now()) {
        return false
      }
    }
    return true
  }

  /**
   *
   * @param id
   * @param triggerId =null手动启动
   * @param stepId 如果传入ALL，清空所有状态
   */
  async run(id: number, triggerId: string, stepId?: string) {
    const entity: PipelineEntity = await this.info(id);
    if (!entity) {
      logger.error(`流水线${id}不存在`);
      return;
    }
    await this.doRun(entity, triggerId, stepId);
  }

  async beforeCheck(entity: PipelineEntity) {

    if (isEnterprise()) {
      checkPlus()
      return {}
    }

    const validTimeEnabled = await this.isPipelineValidTimeEnabled(entity)
    if (!validTimeEnabled) {
      throw new Error(`流水线${entity.id}已过期，不予执行`);
    }

    let suite: UserSuiteEntity = null;
    if (isComm()) {
      suite = await this.checkHasDeployCount(entity.id, entity.userId);
    }
    await this.checkUserStatus(entity.userId);

    return {
      suite
    }
  }

  async doRun(entity: PipelineEntity, triggerId: string, stepId?: string) {

    let suite: any = null
    try {
      const res = await this.beforeCheck(entity);
      suite = res.suite
    } catch (e) {
      logger.error(`流水线${entity.id}触发失败（${triggerId}）：${e.message}`);
    }

    const id = entity.id;
    const pipeline = JSON.parse(entity.content);
    if (!pipeline.id) {
      pipeline.id = id;
    }

    if(entity.userId !=null){
      pipeline.userId = entity.userId;
      pipeline.projectId = entity.projectId;
    }

    if (!pipeline.stages || pipeline.stages.length === 0) {
      return;
    }

    const triggerType = this.getTriggerType(triggerId, pipeline);
    if (triggerType == null) {
      return;
    }

    if (triggerType !== "user") {
      if (entity.disabled) {
        logger.info(`流水线${entity.id}已禁用，不予执行`);
        return;
      }
    }

    const onChanged = async (history: RunHistory) => {
      //保存执行历史
      try {
        logger.info("保存执行历史：", history.id);
        await this.saveHistory(history);
      } catch (e) {
        const pipelineEntity = new PipelineEntity();
        pipelineEntity.id = id;
        pipelineEntity.status = "error";
        pipelineEntity.lastHistoryTime = history.pipeline.status.startTime;
        await this.update(pipelineEntity);
        logger.error("保存执行历史失败：", e);
        throw e;
      }
    };

    const userId = entity.userId;
    const projectId = entity.projectId;
    let userIsAdmin = false

    if (projectId && projectId > 0) {
      userIsAdmin = await this.projectService.isAdmin(projectId);
    } else if (userId > 0) {
      userIsAdmin = await this.userService.isAdmin(userId);
    }
    const user: UserInfo = {
      id: userId,
      role: userIsAdmin ? "admin" : "user"
    };

    const historyId = await this.historyService.start(entity, triggerType);
    const sysInfo: SysInfo = {};
    if (isComm()) {
      const siteInfo = await this.sysSettingsService.getSetting<SysSiteInfo>(SysSiteInfo);
      sysInfo.title = siteInfo.title;
    }

    const taskServiceGetter = this.taskServiceBuilder.create({
      userId,
      projectId
    });
    const accessGetter = await taskServiceGetter.get<IAccessService>("accessService");
    const notificationGetter = await taskServiceGetter.get<INotificationService>("notificationService");
    const cnameProxyService = await taskServiceGetter.get<ICnameProxyService>("cnameProxyService");
    const executor = new Executor({
      user,
      pipeline,
      onChanged,
      accessService: accessGetter,
      cnameProxyService,
      pluginConfigService: this.pluginConfigGetter,
      storage: new DbStorage(userId, this.storageService),
      emailService: this.emailService,
      urlService: this.urlService,
      notificationService: notificationGetter,
      fileRootDir: this.certdConfig.fileRootDir,
      sysInfo,
      serviceGetter: taskServiceGetter
    });
    try {
      runningTasks.set(historyId, executor);
      await executor.init();
      if (stepId) {
        // 清除该step的状态
        executor.clearLastStatus(stepId);
      }
      const result = await executor.run(historyId, triggerType);

      if (result === ResultType.success) {
        if (isComm()) {
          // 消耗成功次数
          await this.userSuiteService.consumeDeployCount(suite, 1);
        }
      }
    } catch (e) {
      logger.error("执行失败：", e);
      // throw e;
    } finally {
      runningTasks.delete(historyId);
    }
  }

  async cancel(historyId: number) {
    const executor = runningTasks.get(historyId);
    if (executor) {
      await executor.cancel();
    }
    const entity = await this.historyService.info(historyId);
    if (entity == null) {
      return;
    }
    const pipeline: Pipeline = JSON.parse(entity.pipeline);
    pipeline.status.status = ResultType.canceled;
    pipeline.status.result = ResultType.canceled;
    const runtime = new RunHistory(historyId, null, pipeline);
    await this.saveHistory(runtime);
  }

  private getTriggerType(triggerId, pipeline) {
    let triggerType = "user";
    if (triggerId != null) {
      //如果不是手动触发
      //查找trigger
      const found = this.findTrigger(pipeline, triggerId);
      const key = this.buildCronKey(pipeline.id, triggerId);
      if (!found) {
        //如果没有找到triggerId，说明被用户删掉了，这里再删除一次
        this.cron.remove(key);
        triggerType = null;
      } else {
        logger.info(`timer trigger:${key}, ${found.title}, ${JSON.stringify(found.props)}`);
        triggerType = found.type || "timer";
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

  async getProjectId(pipelineId: number) {
    const pipelineEntity = await this.repository.findOne({
      select: {
        projectId: true,
      },
      where: {
        id: pipelineId,
      },
    });
    if (!pipelineEntity) {
      return null
    }
    return pipelineEntity.projectId;
  }
  private async saveHistory(history: RunHistory) {
    //修改pipeline状态
    let pipelineEntity = new PipelineEntity();
    pipelineEntity.id = parseInt(history.pipeline.id);
    pipelineEntity.status = history.pipeline.status.result + "";
    pipelineEntity.lastHistoryTime = history.pipeline.status.startTime;
    await this.update(pipelineEntity);

    const projectId = await this.getProjectId(pipelineEntity.id);
    pipelineEntity.projectId = projectId;

    const entity: HistoryEntity = new HistoryEntity();
    entity.id = parseInt(history.id);
    entity.userId = history.pipeline.userId;
    entity.status = pipelineEntity.status;
    entity.pipeline = JSON.stringify(history.pipeline);
    entity.pipelineId = parseInt(history.pipeline.id);
    entity.projectId = pipelineEntity.projectId;
    await this.historyService.save(entity);

    const logEntity: HistoryLogEntity = new HistoryLogEntity();
    logEntity.id = entity.id;
    logEntity.userId = entity.userId;
    logEntity.pipelineId = entity.pipelineId;
    logEntity.historyId = entity.id;
    logEntity.logs = JSON.stringify(history.logs);
    logEntity.projectId = pipelineEntity.projectId;
    await this.historyLogService.addOrUpdate(logEntity);
  }

  async count(param: { userId?: any, projectId?: number }) {
    const count = await this.repository.count({
      where: {
        userId: param.userId,
        projectId: param.projectId,
        isTemplate: false
      }
    });
    return count;
  }

  async statusCount(param: { userId?: any, projectId?: number } = {}) {
    const statusCount = await this.repository
      .createQueryBuilder()
      .select("status")
      .addSelect("count(1)", "count")
      .where({
        userId: param.userId,
        projectId: param.projectId,
        isTemplate: false
      })
      .groupBy("status")
      .getRawMany();
    return statusCount;
  }

  async enableCount(param: { userId?: any, projectId?: number } = {}) {
    const statusCount = await this.repository
      .createQueryBuilder()
      .select("disabled")
      .addSelect("count(1)", "count")
      .where({
        userId: param.userId,
        projectId: param.projectId,
        isTemplate: false
      })
      .groupBy("disabled")
      .getRawMany();
    const result = {
      enabled: 0,
      disabled: 0,
    };
    for (const item of statusCount) {
      result[item.disabled ? "disabled" : "enabled"] = parseInt(item.count);
    }
    return result;
  }

  async latestExpiringList({ userId, projectId }: any) {
    let list = await this.repository.find({
      select: {
        id: true,
        title: true,
        status: true
      },
      where: {
        userId,
        disabled: false,
        projectId,
        isTemplate: false
      }
    });
    await this.fillLastVars(list);
    list = list.filter(item => {
      return item.lastVars?.certExpiresTime != null;
    });
    list = list.sort((a, b) => {
      return a.lastVars.certExpiresTime - b.lastVars.certExpiresTime;
    });

    return list.slice(0, 5);
  }

  async createCountPerDay(param: { days: number } = { days: 7 }) {
    const todayEnd = dayjs().endOf("day");
    const result = await this.getRepository()
      .createQueryBuilder("main")
      .select(`${this.dbAdapter.date("main.createTime")}  AS date`) // 将UNIX时间戳转换为日期
      .addSelect("COUNT(1) AS count")
      .where({
        // 0点
        createTime: MoreThan(todayEnd.add(-param.days, "day").toDate()),
        isTemplate: false
      })
      .groupBy("date")
      .getRawMany();

    return result;
  }

  async batchDelete(ids: number[], userId?: number, projectId?: number) {
    if (!isPlus()) {
      throw new NeedVIPException("此功能需要升级专业版");
    }
    for (const id of ids) {
      if (userId && userId > 0) {
        await this.checkUserId(id, userId);
      }
      if (projectId) {
        await this.checkUserId(id, projectId, "projectId")
      }
      await this.delete(id);
    }
  }

  async batchUpdateGroup(ids: number[], groupId: number, userId: any, projectId?: number) {
    if (!isPlus()) {
      throw new NeedVIPException("此功能需要升级专业版");
    }
    const query: any = {}
    if (userId && userId > 0) {
      query.userId = userId;
    }
    if (projectId) {
      query.projectId = projectId;
    }
    await this.repository.update(
      {
        id: In(ids),
        ...query
      },
      { groupId }
    );
  }




  /**
   * 批量转移到其他项目
   */
  async batchTransfer(ids: number[], projectId: number) {
    if (!isPlus()) {
      throw new NeedVIPException("此功能需要升级专业版");
    }
    if (!isEnterprise()) {
      throw new Error("当前为非企业模式，不允许转移到其他项目");
    }
    if (!projectId || projectId <= 0) {
      throw new Error("projectId不能为空");
    }
    const userId = -1 // 强制为-1

    async function eachSteps(pipeline, callback) {
      for (const stage of pipeline.stages) {
        for (const task of stage.tasks) {
          for (const step of task.steps) {
            await callback(step);
          }
        }
      }
    }


    for (const id of ids) {
      const pipelineEntity = await this.info(id);
      if (!pipelineEntity) {
        logger.error(`转移流水线失败，pipeline:${id}不存在`);
        continue;
      }
      if (pipelineEntity.projectId === projectId) {
        logger.info(`流水线:${id}已在项目${projectId}中，跳过`);
        continue;
      }

      const entity: any = {
        ...pipelineEntity,
        id: pipelineEntity.id,
        userId: userId,
        projectId: projectId,
        groupId: null,
      }

      const pipeline = JSON.parse(pipelineEntity.content);
      pipeline.userId = userId;
      pipeline.projectId = projectId;

      //转移和修改access 和 Notification
      await eachSteps(pipeline, async (step) => {
        const type = step.type;
        //plugin 
        const pluginDefine: any = pluginRegistry.getDefine(type);
        if (pluginDefine) {
          for (const key in step.input) {
            const value = step.input[key];
            if (!value || value <= 0) {
              continue;
            }
            if (!pluginDefine.input[key]){
              continue;
            }
            const componentName = pluginDefine.input[key].component?.name;
            if (componentName === "access-selector" || componentName === "AccessSelector") {
              //这是一个授权ID属性，检查是否需要转移授权
              const newAccessId = await this.accessService.copyTo(value,projectId);
              step.input[key] = newAccessId;
            }
          }
        }
      })
      pipeline.notifications = [
        {
          "type": "custom",
          "when": [
            "error",
            "turnToSuccess"
          ],
          "notificationId": 0,
          "title": "使用默认通知",
          "id": nanoid()
        }
      ],

      entity.content = JSON.stringify(pipeline);
      await this.unregisterTriggers(entity.id);
      await this.repository.save(entity);
      await this.save(entity)
    }



  }


  async batchUpdateTrigger(ids: number[], trigger: any, userId: any, projectId?: number) {
    if (!isPlus()) {
      throw new NeedVIPException("此功能需要升级专业版");
    }
    //允许管理员修改，userId=null
    const query: any = {}
    if (userId && userId > 0) {
      query.userId = userId;
    }
    if (projectId) {
      query.projectId = projectId;
    }
    const list = await this.find({
      where: {
        id: In(ids),
        ...query
      }
    });

    for (const item of list) {
      const pipeline = JSON.parse(item.content);
      if (trigger.props === false) {
        //清除trigger
        pipeline.triggers = []
      } else {
        if (trigger.random === true) {
          //随机时间
          const start = dayjs().format("YYYY-MM-DD") + " " + trigger.randomRange[0];
          let end = dayjs().format("YYYY-MM-DD") + " " + trigger.randomRange[1];
          if (trigger.randomRange[1] < trigger.randomRange[0]) {
            //跨天
            end = dayjs().add(1, "day").format("YYYY-MM-DD") + " " + trigger.randomRange[1];
          }
          const startTime = dayjs(start).valueOf();
          const endTime = dayjs(end).valueOf();
          const randomTime = Math.floor(Math.random() * (endTime - startTime)) + startTime;
          const time = dayjs(randomTime).format(" ss:mm:HH").replaceAll(":", " ").replaceAll(" 0", " ").trim();
          set(trigger, "props.cron", `${time} * * *`)
        }
        delete trigger.random
        delete trigger.randomRange;
        pipeline.triggers = [{
          id: nanoid(),
          title: "定时触发",
          ...trigger
        }];
      }

      await this.doUpdatePipelineJson(item, pipeline);
    }

  }

  async batchUpdateNotifications(ids: number[], notification: Notification, userId: any, projectId?: number) {
    if (!isPlus()) {
      throw new NeedVIPException("此功能需要升级专业版");
    }
    //允许管理员修改，userId=null
    const query: any = {}
    if (userId && userId > 0) {
      query.userId = userId;
    }
    if (projectId) {
      query.projectId = projectId;
    }
    const list = await this.find({
      where: {
        id: In(ids),
        ...query
      }
    });

    for (const item of list) {
      const pipeline = JSON.parse(item.content);
      pipeline.notifications = [{
        id: nanoid(),
        title: "通知",
        /**
         * type: NotificationType;
         *   when: NotificationWhen[];
         *   options: EmailOptions;
         *   notificationId: number;
         *   title: string;
         *   subType: string;
         */
        type: "other",
        ...notification
      }];
      await this.doUpdatePipelineJson(item, pipeline);
    }
  }

  async batchRerun(ids: number[], force: boolean, userId: any, projectId?: number) {
    if (!isPlus()) {
      throw new NeedVIPException("此功能需要升级专业版");
    }
    //允许userId为空，为空则为管理员触发
    if (ids.length === 0) {
      throw new Error("参数错误 ids 不能为空");
    }
    const where: any = {
      id: In(ids),
      userId,
    }
    if (projectId) {
      where.projectId = projectId
    }
    const list = await this.repository.find({
      select: {
        id: true
      },
      where: where
    });

    ids = list.map(item => item.id);

    //异步执行
    this.startBatchRerun(userId, ids, force);
  }

  startBatchRerun(userId: number, ids: number[], force: boolean) {
    for (const id of ids) {
      executorQueue.addTask(userId, {
        task: async () => {
          if (force) {
            await this.run(id, null, "ALL");
          } else {
            await this.run(id, null);
          }
        }
      });
    }
  }


  async getUserPipelineCount(userId) {
    return await this.repository.count({ where: { userId } });
  }

  async getSimplePipelines(pipelineIds: number[], userId?: number, projectId?: number) {
    return await this.repository.find({
      select: {
        id: true,
        title: true
      },
      where: {
        id: In(pipelineIds),
        userId,
        projectId
      }
    });
  }


  private async checkUserStatus(userId: number) {
    if (isEnterprise()) {
      //企业模式不检查用户状态，都允许运行流水线
      return
    }
    const userEntity = await this.userService.info(userId);
    if (userEntity == null) {
      throw new Error("用户不存在");
    }
    if (userEntity.status === 0) {
      const message = `账户${userId}已被禁用，禁止运行流水线`;
      throw new Error(message);
    }
    const sysPublic = await this.sysSettingsService.getPublicSettings();
    if (isPlus() && sysPublic.userValidTimeEnabled === true) {
      //校验用户有效期是否设置
      if (userEntity.validTime != null && userEntity.validTime > 0) {
        if (userEntity.validTime < new Date().getTime()) {
          //用户已过期
          const message = `账户${userId}已过有效期，禁止运行流水线`;
          throw new Error(message);
        }
      }
    }
  }

  async createAutoPipeline(req: { domains: string[]; email: string; userId: number, projectId?: number, from: string }) {

    const randomHour = Math.floor(Math.random() * 6);
    const randomMin = Math.floor(Math.random() * 60);
    const randomCron = `0 ${randomMin} ${randomHour} * * *`;

    let pipeline: any = {
      title: req.domains[0] + `证书自动申请【${req.from ?? "OpenAPI"}】`,
      runnableType: "pipeline",
      triggers: [
        {
          id: nanoid(),
          title: "定时触发",
          props: {
            cron: randomCron,
          },
          type: "timer"
        }
      ],
      notifications: [
        {
          id: nanoid(),
          type: "custom",
          when: ["error", "turnToSuccess", "success"],
          notificationId: 0,
          title: "默认通知",
        }
      ],
      stages: [
        {
          id: nanoid(),
          title: "证书申请阶段",
          maxTaskCount: 1,
          runnableType: "stage",
          tasks: [
            {
              id: nanoid(),
              title: "证书申请任务",
              runnableType: "task",
              steps: [
                {
                  id: nanoid(),
                  title: "申请证书",
                  runnableType: "step",
                  input: {
                    renewDays: 20,
                    domains: req.domains,
                    email: req.email,
                    "challengeType": "auto",
                    "sslProvider": "letsencrypt",
                    "privateKeyType": "rsa_2048",
                    "certProfile": "classic",
                    "preferredChain": "ISRG Root X1",
                    "useProxy": false,
                    "skipLocalVerify": false,
                    "maxCheckRetryCount": 20,
                    "waitDnsDiffuseTime": 30,
                    "pfxArgs": "-macalg SHA1 -keypbe PBE-SHA1-3DES -certpbe PBE-SHA1-3DES",
                    "successNotify": true
                  },
                  strategy: {
                    runStrategy: 0 // 正常执行
                  },
                  type: "CertApply"
                }
              ]
            }
          ]
        }
      ]
    };

    const bean = new PipelineEntity();
    bean.title = pipeline.title;
    bean.content = JSON.stringify(pipeline);
    bean.userId = req.userId;
    bean.status = "none";
    bean.type = "cert_auto";
    bean.disabled = false
    bean.keepHistoryCount = 30
    bean.projectId = req.projectId
    await this.save(bean)


    return bean;
  }

  async getStatus(pipelineId: number) {
    const res = await this.repository.findOne({
      select: {
        status: true
      },
      where: {
        id: pipelineId
      }
    });
    return res?.status;
  }

  async getPipelineUserId(pipelineId: number) {
    const res = await this.repository.findOne({
      select: {
        userId: true
      },
      where: {
        id: pipelineId
      }
    });
    return res?.userId;
  }

  async disabled(id: number, disabled: boolean) {
    await this.repository.update(id, { disabled });
    await this.registerTriggerById(id);
  }

  async refreshWebhookKey(id: number) {
    const webhookKey = await this.genWebhookKey();
    await this.repository.update(id, { webhookKey });
    return webhookKey;
  }
  async genWebhookKey() {
    return utils.id.simpleNanoId(24);
  }
  async triggerByWebhook(webhookKey: string) {
    const pipelineEntity = await this.findOne({
      select: {
        id: true,
        content: true,
      },
      where: {
        webhookKey
      }
    })
    if (!pipelineEntity) {
      throw new Error("webhookKey不存在");
    }
    const pipeline = JSON.parse(pipelineEntity.content);
    const trigger = pipeline.triggers.find((trigger: any) => trigger.type === "webhook");
    if (!trigger) {
      throw new Error("该流水线的webhook未启用");
    }
    await this.run(pipelineEntity.id, trigger.id);
  }
}
