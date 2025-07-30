import { Config, Inject, Provide, Scope, ScopeEnum, sleep } from "@midwayjs/core";
import { InjectEntityModel } from "@midwayjs/typeorm";
import { In, MoreThan, Repository } from "typeorm";
import {
  AccessService,
  BaseService,
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
import { isComm, isPlus } from "@certd/plus-core";
import { logger } from "@certd/basic";
import { UrlService } from "./url-service.js";
import { NotificationService } from "./notification-service.js";
import { UserSuiteEntity, UserSuiteService } from "@certd/commercial-core";
import { CertInfoService } from "../../monitor/service/cert-info-service.js";
import { TaskServiceBuilder } from "./getter/task-service-getter.js";
import { nanoid } from "nanoid";
import { set } from "lodash-es";

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

  //@ts-ignore
  getRepository() {
    return this.repository;
  }

  async add(bean: PipelineEntity) {
    bean.status = ResultType.none;
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
      if(pipeline.stages){
        RunnableCollection.each(pipeline.stages, (runnable: any) => {
          stepCount++;
        });
      }
      // @ts-ignore
      item.stepCount = stepCount;
      // @ts-ignore
      item.triggerCount = pipeline.triggers?.length;
      delete item.content;
    }

    return result;
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
    if (info && !info.disabled) {
      const pipeline = JSON.parse(info.content);
      this.registerTriggers(pipeline, false);
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
    }
    const isUpdate = bean.id > 0 && old != null;


    const pipeline = JSON.parse(bean.content || "{}");
    RunnableCollection.initPipelineRunnableType(pipeline);
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
    if (!isUpdate) {
      //如果是添加，先保存一下，获取到id，更新pipeline.id
      await this.addOrUpdate(bean);
    }

    await this.doUpdatePipelineJson(bean, pipeline);

    //保存域名信息到certInfo表
    let fromType = "pipeline";
    if (bean.type === "cert_upload") {
      fromType = "upload";
    }else if (bean.type === "cert_auto") {
      fromType = "auto";
    }
    await this.certInfoService.updateDomains(pipeline.id, pipeline.userId || bean.userId, domains, fromType);
    return bean;
  }

  /**
   * 更新Pipeline， 包括trigger
   * @param bean
   * @param pipeline
   */
  async doUpdatePipelineJson(bean: PipelineEntity, pipeline: Pipeline) {
    await this.clearTriggers(bean);
    if (pipeline.title) {
      bean.title = pipeline.title;
    }
    pipeline.id = bean.id;
    bean.content = JSON.stringify(pipeline);
    await this.addOrUpdate(bean);
    await this.registerTrigger(bean);
  }

  private async checkMaxPipelineCount(bean: PipelineEntity, pipeline: Pipeline, domains: string[]) {
    // if (!isPlus()) {
    //   const count = await this.repository.count();
    //   if (count >= freeCount) {
    //     throw new NeedVIPException(`基础版最多只能创建${freeCount}条流水线`);
    //   }
    // }
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
        templateId: 0
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
        await this.clearTriggers(entity.id);
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
      this.registerCron(pipeline.id, trigger);
    }

    if (immediateTriggerOnce) {
      await this.trigger(pipeline.id);
      await sleep(200);
    }
  }

  async trigger(id: any, stepId?: string) {
    const entity: PipelineEntity = await this.info(id);
    if (isComm()) {
      await this.checkHasDeployCount(id, entity.userId);
    }
    await this.checkUserStatus(entity.userId);
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
    await this.clearTriggers(id);
    //TODO 删除storage
    // const storage = new DbStorage(pipeline.userId, this.storageService);
    // await storage.remove(pipeline.id);
    await super.delete([id]);
    await this.historyService.deleteByPipelineId(id);
    await this.historyLogService.deleteByPipelineId(id);
    await this.certInfoService.deleteByPipelineId(id);
  }

  async clearTriggers(id: number | PipelineEntity) {
    if (id == null) {
      return;
    }
    let pipeline: PipelineEntity = null;
    if (typeof id === "number") {
      pipeline = await this.info(id);
    } else {
      pipeline = id;
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
  }

  registerCron(pipelineId, trigger) {
    if (pipelineId == null) {
      logger.warn("pipelineId为空，无法注册定时任务");
      return;
    }

    let cron = trigger.props?.cron;
    if (cron == null) {
      return;
    }
    cron = cron.trim();
    if (cron.startsWith("* *")) {
      cron = cron.replace("* *", "0 0");
    }
    if (cron.startsWith("*")) {
      cron = cron.replace(/\*/g, "0");
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
        try {
          await this.run(pipelineId, triggerId);
        } catch (e) {
          logger.error("定时job执行失败：", e);
        }
      }
    });
    logger.info("当前定时器数量：", this.cron.getTaskSize());
  }

  /**
   *
   * @param id
   * @param triggerId =null手动启动
   * @param stepId 如果传入ALL，清空所有状态
   */
  async run(id: number, triggerId: string, stepId?: string) {
    const entity: PipelineEntity = await this.info(id);
    await this.doRun(entity, triggerId, stepId);
  }

  async doRun(entity: PipelineEntity, triggerId: string, stepId?: string) {
    const id = entity.id;
    let suite: UserSuiteEntity = null;
    if (isComm()) {
      suite = await this.checkHasDeployCount(id, entity.userId);
    }
    try {
      await this.checkUserStatus(entity.userId);
    } catch (e) {
      logger.info(e.message);
      return;
    }


    const pipeline = JSON.parse(entity.content);
    if (!pipeline.id) {
      pipeline.id = id;
    }

    if (!pipeline.stages || pipeline.stages.length === 0) {
      return;
    }

    const triggerType = this.getTriggerType(triggerId, pipeline);
    if (triggerType == null) {
      return;
    }

    if (triggerType === "timer") {
      if (entity.disabled) {
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
    const historyId = await this.historyService.start(entity, triggerType);
    const userIsAdmin = await this.userService.isAdmin(userId);
    const user: UserInfo = {
      id: userId,
      role: userIsAdmin ? "admin" : "user"
    };


    const sysInfo: SysInfo = {};
    if (isComm()) {
      const siteInfo = await this.sysSettingsService.getSetting<SysSiteInfo>(SysSiteInfo);
      sysInfo.title = siteInfo.title;
    }

    const taskServiceGetter = this.taskServiceBuilder.create({
      userId
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
      if (!found) {
        //如果没有找到triggerId，说明被用户删掉了，这里再删除一次
        this.cron.remove(this.buildCronKey(pipeline.id, triggerId));
        triggerType = null;
      } else {
        logger.info("timer trigger:" + found.id, found.title, found.cron);
        triggerType = "timer";
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
    pipelineEntity.status = history.pipeline.status.result + "";
    pipelineEntity.lastHistoryTime = history.pipeline.status.startTime;
    await this.update(pipelineEntity);

    const entity: HistoryEntity = new HistoryEntity();
    entity.id = parseInt(history.id);
    entity.userId = history.pipeline.userId;
    entity.status = pipelineEntity.status;
    entity.pipeline = JSON.stringify(history.pipeline);
    entity.pipelineId = parseInt(history.pipeline.id);
    await this.historyService.save(entity);

    const logEntity: HistoryLogEntity = new HistoryLogEntity();
    logEntity.id = entity.id;
    logEntity.userId = entity.userId;
    logEntity.pipelineId = entity.pipelineId;
    logEntity.historyId = entity.id;
    logEntity.logs = JSON.stringify(history.logs);
    await this.historyLogService.addOrUpdate(logEntity);
  }

  async count(param: { userId?: any }) {
    const count = await this.repository.count({
      where: {
        userId: param.userId
      }
    });
    return count;
  }

  async statusCount(param: { userId?: any } = {}) {
    const statusCount = await this.repository
      .createQueryBuilder()
      .select("status")
      .addSelect("count(1)", "count")
      .where({
        userId: param.userId
      })
      .groupBy("status")
      .getRawMany();
    return statusCount;
  }

  async latestExpiringList({ userId }: any) {
    let list = await this.repository.find({
      select: {
        id: true,
        title: true,
        status: true
      },
      where: {
        userId
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
        createTime: MoreThan(todayEnd.add(-param.days, "day").toDate())
      })
      .groupBy("date")
      .getRawMany();

    return result;
  }

  async batchDelete(ids: number[], userId: number) {
    for (const id of ids) {
      await this.checkUserId(id, userId);
      await this.delete(id);
    }
  }

  async batchUpdateGroup(ids: number[], groupId: number, userId: any) {
    await this.repository.update(
      {
        id: In(ids),
        userId
      },
      { groupId }
    );
  }


  async batchUpdateTrigger(ids: number[], trigger: any, userId: any) {

    const list = await this.find({
      where: {
        id: In(ids),
        userId
      }
    });

    for (const item of list) {
      const pipeline = JSON.parse(item.content);
      pipeline.triggers = [{
        id: nanoid(),
        title: "定时触发",
        ...trigger
      }];
      await this.doUpdatePipelineJson(item, pipeline);
    }

  }

  async batchUpdateNotifications(ids: number[], notification: Notification, userId: any) {

    const list = await this.find({
      where: {
        id: In(ids),
        userId
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

  async batchRerun(ids: number[], userId: any) {
    if (!isPlus()) {
      throw new NeedVIPException("此功能需要升级专业版");
    }

    if (!userId || ids.length === 0) {
      return;
    }
    const list = await this.repository.find({
      select: {
        id: true
      },
      where: {
        id: In(ids),
        userId
      }
    });

    ids = list.map(item => item.id);

    //异步执行
    this.startBatchRerun(ids);
  }

  async startBatchRerun(ids: number[]) {
    //20条一批
    const batchSize = 20;
    for (let i = 0; i < ids.length; i += batchSize) {
      const batchIds = ids.slice(i, i + batchSize);
      const batchPromises = batchIds.map(async (id) => {
        await this.run(id, null, "ALL");
      });
      await Promise.all(batchPromises);
    }
  }


  async getUserPipelineCount(userId) {
    return await this.repository.count({ where: { userId } });
  }

  async getSimplePipelines(pipelineIds: number[], userId?: number) {
    return await this.repository.find({
      select: {
        id: true,
        title: true
      },
      where: {
        id: In(pipelineIds),
        userId
      }
    });
  }


  private async checkUserStatus(userId: number) {
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

  async createAutoPipeline(req: { domains: string[]; email: string; userId: number ,from:string}) {

    const randomHour = Math.floor(Math.random() * 6);
    const randomMin = Math.floor(Math.random() * 60);
    const randomCron = `0 ${randomMin} ${randomHour} * * *`;

    let pipeline: any = {
      title: req.domains[0] + `证书自动申请【${req.from??"OpenAPI"}】`,
      runnableType: "pipeline",
      triggers: [
        {
          id: nanoid(),
          title: "定时触发",
          props:{
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
                    renewDays: 35,
                    domains: req.domains,
                    email: req.email,
                    "challengeType": "auto",
                    "sslProvider": "letsencrypt",
                    "privateKeyType": "rsa_2048",
                    "certProfile": "classic",
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
}
