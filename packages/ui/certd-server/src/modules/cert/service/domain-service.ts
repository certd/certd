import { http, logger, utils } from '@certd/basic';
import { AccessService, BaseService, isEnterprise } from '@certd/lib-server';
import { doPageTurn, Pager, PageRes } from '@certd/pipeline';
import { DomainVerifiers } from "@certd/plugin-cert";
import { createDnsProvider, dnsProviderRegistry, DomainParser } from "@certd/plugin-lib";
import { Inject, Provide, Scope, ScopeEnum } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import dayjs from 'dayjs';
import { merge } from 'lodash-es';
import { In, LessThan, Not, Repository } from 'typeorm';
import { BackTask, taskExecutor } from '../../basic/service/task-executor.js';
import { CnameRecordEntity } from "../../cname/entity/cname-record.js";
import { CnameRecordService } from '../../cname/service/cname-record-service.js';
import { Cron } from '../../cron/cron.js';
import { UserDomainImportSetting, UserDomainMonitorSetting } from '../../mine/service/models.js';
import { UserSettingsService } from '../../mine/service/user-settings-service.js';
import { JobHistoryService } from '../../monitor/service/job-history-service.js';
import { TaskServiceBuilder } from '../../pipeline/service/getter/task-service-getter.js';
import { SubDomainService } from "../../pipeline/service/sub-domain-service.js";
import { DomainEntity } from '../entity/domain.js';
import { TldClient } from './tld-client.js';

export interface SyncFromProviderReq {
  userId: number;
  projectId: number;
  dnsProviderType: string;
  dnsProviderAccessId: number;
}


const DOMAIN_IMPORT_TASK_TYPE = 'domainImportTask'
const DOMAIN_EXPIRE_TASK_TYPE = 'domainExpirationSyncTask'

const DOMAIN_EXPIRE_CHECK_TYPE = 'domainExpirationCheck'


/**
 *
 */
@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class DomainService extends BaseService<DomainEntity> {
  @InjectEntityModel(DomainEntity)
  repository: Repository<DomainEntity>;

  @Inject()
  accessService: AccessService;
  @Inject()
  subDomainService: SubDomainService;

  @Inject()
  cnameRecordService: CnameRecordService;

  @Inject()
  taskServiceBuilder: TaskServiceBuilder;

  @Inject()
  userSettingService: UserSettingsService;

  @Inject()
  jobHistoryService: JobHistoryService;

  @Inject()
  cron: Cron;



  //@ts-ignore
  getRepository() {
    return this.repository;
  }

  async add(param) {
    if (param.userId == null) {
      throw new Error('userId 不能为空');
    }
    if (!param.domain) {
      throw new Error('domain 不能为空');
    }
    const old = await this.repository.findOne({
      where: {
        domain: param.domain,
        userId: param.userId
      }
    });
    if (old) {
      throw new Error(`域名（${param.domain}）不能重复`);
    }
    if (!param.fromType) {
      param.fromType = 'manual'
    }
    return await super.add(param);
  }

  async update(param) {
    if (!param.id) {
      throw new Error('id 不能为空');
    }
    const old = await this.info(param.id)
    if (!old) {
      throw new Error('domain记录不存在');
    }

    const same = await this.repository.findOne({
      where: {
        domain: param.domain,
        userId: old.userId,
        id: Not(param.id)
      }
    });

    if (same) {
      throw new Error(`域名（${param.domain}）不能重复`);
    }
    delete param.userId
    return await super.update(param);


  }

  /**
   *
   * @param userId
   * @param domains //去除* 且去重之后的域名列表
   */
  async getDomainVerifiers(userId: number, projectId: number, domains: string[]): Promise<DomainVerifiers> {

    const mainDomainMap: Record<string, string> = {}
    const taskService = this.taskServiceBuilder.create({ userId: userId, projectId: projectId });
    const subDomainGetter = await taskService.getSubDomainsGetter();
    const domainParser = new DomainParser(subDomainGetter)

    const mainDomains = []
    for (const domain of domains) {
      const mainDomain = await domainParser.parse(domain);
      mainDomainMap[domain] = mainDomain;
      mainDomains.push(mainDomain)
    }

    //匹配DNS记录
    let allDomains = [...domains, ...mainDomains]
    //去重
    allDomains = [...new Set(allDomains)]

    //从 domain 表中获取配置
    const domainRecords = await this.find({
      where: {
        domain: In(allDomains),
        userId,
        projectId,
        disabled: false,
      }
    })

    const dnsMap = domainRecords.filter(item => item.challengeType === 'dns').reduce((pre, item) => {
      pre[item.domain] = item
      return pre
    }, {})

    const httpMap = domainRecords.filter(item => item.challengeType === 'http').reduce((pre, item) => {
      pre[item.domain] = item
      return pre
    }, {})


    //从cname record表中获取配置
    const cnameRecords = await this.cnameRecordService.find({
      where: {
        domain: In(allDomains),
        userId,
        projectId,
        status: "valid",
      }
    })

    const cnameMap = cnameRecords.reduce((pre, item) => {
      pre[item.domain] = item
      return pre
    }, {})

    //构建域名验证计划
    const domainVerifiers: DomainVerifiers = {}

    for (const domain of domains) {
      const mainDomain = mainDomainMap[domain]

      const dnsRecord = dnsMap[mainDomain]
      if (dnsRecord) {
        domainVerifiers[domain] = {
          domain,
          mainDomain,
          type: 'dns',
          dns: {
            dnsProviderType: dnsRecord.dnsProviderType,
            dnsProviderAccessId: dnsRecord.dnsProviderAccess
          }
        }
        continue
      }
      const cnameRecord: CnameRecordEntity = cnameMap[domain]
      if (cnameRecord) {
        domainVerifiers[domain] = {
          domain,
          mainDomain,
          type: 'cname',
          cname: {
            domain: cnameRecord.domain,
            hostRecord: cnameRecord.hostRecord,
            recordValue: cnameRecord.recordValue
          }
        }
        continue
      }
      const httpRecord = httpMap[domain]
      if (httpRecord) {
        domainVerifiers[domain] = {
          domain,
          mainDomain,
          type: 'http',
          http: {
            httpUploaderType: httpRecord.httpUploaderType,
            httpUploaderAccess: httpRecord.httpUploaderAccess,
            httpUploadRootDir: httpRecord.httpUploadRootDir
          }
        }
        continue
      }
      domainVerifiers[domain] = null
    }

    return domainVerifiers;
  }


  async startDomainImportTask(req: { userId: number, projectId: number, key: string }) {
    const key = req.key
    const setting = await this.userSettingService.getSetting<UserDomainImportSetting>(req.userId, req.projectId, UserDomainImportSetting)

    const item = setting.domainImportList.find(item => item.key === key)
    if (!item) {
      throw new Error(`域名导入任务配置（${key}）还未注册`)
    }
    const { dnsProviderType, dnsProviderAccessId, title } = item

    taskExecutor.start(new BackTask({
      type: DOMAIN_IMPORT_TASK_TYPE,
      key,
      title: title,
      run: async (task: BackTask) => {
        await this._syncFromProvider({
          userId: req.userId,
          projectId: req.projectId,
          dnsProviderType,
          dnsProviderAccessId,
        }, task)
      },
    }))
  }

  private async _syncFromProvider(req: SyncFromProviderReq, task: BackTask) {
    const { userId, projectId, dnsProviderType, dnsProviderAccessId } = req;

    const serviceGetter = this.taskServiceBuilder.create({ userId, projectId });
    const subDomainGetter = await serviceGetter.getSubDomainsGetter();
    const domainParser = new DomainParser(subDomainGetter)

    const access = await this.accessService.getById(dnsProviderAccessId, userId, projectId);
    const context = { access, logger, http, utils, domainParser, serviceGetter };
    // 翻页查询dns的记录
    const dnsProvider = await createDnsProvider({ dnsProviderType, context })

    const pager = new Pager({
      pageNo: 1,
      pageSize: 100,
    })
    const challengeType = "dns"

    const getPage = async (pager: Pager) => {
      return await dnsProvider.getDomainListPage(pager)
    }

    const itemHandle = async (domainRecord: any) => {
      task.incrementCurrent()
      let domain = domainRecord.domain
      if (domain.endsWith(".")) {
        domain = domain.slice(0, -1)
      }

      const old = await this.findOne({
        where: {
          domain,
          userId,
          projectId,
        }
      })
      if (old) {
        // if (old.fromType !== 'auto') {
        //   //如果是手动的，跳过更新校验配置
        //   return
        // }
        if (old) {
          //如果old存在，直接跳过
          task.incrementSkip()
          return
        }
        const updateObj: any = {
          id: old.id,
          dnsProviderType,
          dnsProviderAccess: dnsProviderAccessId,
          challengeType,
        }
        //更新
        await super.update(updateObj)
      } else {
        //添加
        await this.add({
          userId,
          projectId,
          domain,
          dnsProviderType,
          dnsProviderAccess: dnsProviderAccessId,
          challengeType,
          disabled: false,
          fromType: 'manual',
        })
        logger.info(`导入域名${domain}到用户${userId}`)
      }
    }
    const batchHandle = async (pageRes: PageRes<any>) => {
      task.setTotal(pageRes.total || 0)
    }
    await doPageTurn({ pager, getPage, itemHandle, batchHandle })
    const key = `user_${userId || 0}`
    logger.info(`从域名提供商${dnsProviderType}导入域名完成(${key})，共导入${task.total}个域名，跳过${task.getSkipCount()}个域名，成功${task.getSuccessCount()}个域名，失败${task.getErrorCount()}个域名`)
  }

  async getDomainImportTaskStatus(req: { userId?: number, projectId?: number }) {
    const userId = req.userId || 0
    const projectId = req.projectId

    const setting = await this.userSettingService.getSetting<UserDomainImportSetting>(userId, projectId, UserDomainImportSetting)
    const list = setting?.domainImportList || []

    const taskList: any = []

    for (const item of list) {
      const { key } = item

      const task = taskExecutor.get(DOMAIN_IMPORT_TASK_TYPE, key)

      taskList.push({
        ...item,
        task: task,
      })
    }
    return taskList
  }

  async getProviderTitle(req: { userId?: number, projectId?: number, dnsProviderType: string, dnsProviderAccessId: number }) {
    const userId = req.userId || 0
    const projectId = req.projectId
    const { dnsProviderType, dnsProviderAccessId } = req
    const dnsProviderDefine = dnsProviderRegistry.getDefine(dnsProviderType)
    if (!dnsProviderDefine) {
      throw new Error(`该域名提供商（${dnsProviderType}）不存在，请检查是否已被注册`)
    }
    const access = await this.accessService.getSimpleInfo(dnsProviderAccessId)
    if (!access || access.userId !== userId) {
      throw new Error(`该授权（${dnsProviderAccessId}）不存在，请检查是否已被删除`)
    }
    if (projectId && access.projectId !== projectId) {
      throw new Error(`该授权（${dnsProviderAccessId}）不存在，请检查是否已被删除`)
    }
    return {
      title: `${dnsProviderDefine.title}_${access.name || ''}`,
      //@ts-ignore
      icon: dnsProviderDefine.icon || '',
    }
  }

  async addDomainImportTask(req: { userId?: number, projectId?: number, dnsProviderType: string, dnsProviderAccessId: number, index?: number }) {
    const userId = req.userId || 0
    const projectId = req.projectId
    const { dnsProviderType, dnsProviderAccessId, index = 0 } = req
    const key = `user_${userId}_${dnsProviderType}_${dnsProviderAccessId}`

    const { title, icon } = await this.getProviderTitle(req)


    const setting = await this.userSettingService.getSetting<UserDomainImportSetting>(userId, projectId, UserDomainImportSetting)
    setting.domainImportList = setting.domainImportList || []
    if (setting.domainImportList.find(item => item.key === key)) {
      throw new Error(`该域名导入任务${key}已存在`)
    }

    const access = await this.accessService.getAccessById(dnsProviderAccessId, true, userId, projectId)
    if (!access) {
      throw new Error(`该授权（${dnsProviderAccessId}）不存在，请检查是否已被删除`)
    }

    const item = {
      dnsProviderType,
      dnsProviderAccessId,
      key,
      title,
      icon: icon || '',
    }
    setting.domainImportList.splice(index, 0, item)
    await this.userSettingService.saveSetting(userId, projectId, setting)

    return item
  }

  async deleteDomainImportTask(req: { userId?: number, projectId?: number, key: string }) {
    const userId = req.userId || 0
    const { key } = req

    const projectId = req.projectId
    const setting = await this.userSettingService.getSetting<UserDomainImportSetting>(userId, projectId, UserDomainImportSetting)
    setting.domainImportList = setting.domainImportList || []
    const index = setting.domainImportList.findIndex(item => item.key === key)
    if (index === -1) {
      throw new Error(`该域名导入任务${key}不存在`)
    }
    setting.domainImportList.splice(index, 1)
    taskExecutor.clear(DOMAIN_IMPORT_TASK_TYPE, key)
    await this.userSettingService.saveSetting(userId, projectId, setting)
  }

  async saveDomainImportTask(req: { userId?: number, projectId?: number, dnsProviderType: string, dnsProviderAccessId: number, key?: string }) {
    const userId = req.userId || 0
    const projectId = req.projectId
    const { dnsProviderType, dnsProviderAccessId, key } = req
    const setting = await this.userSettingService.getSetting<UserDomainImportSetting>(userId, projectId, UserDomainImportSetting)
    setting.domainImportList = setting.domainImportList || []

    let index = 0
    if (key) {
      index = setting.domainImportList.findIndex(item => item.key === key)
      if (index === -1) {
        throw new Error(`该域名导入任务${key}不存在`)
      }
      await this.deleteDomainImportTask({ userId, projectId, key })
    }

    return await this.addDomainImportTask({ userId, projectId, dnsProviderType, dnsProviderAccessId, index })
  }




  async getSyncExpirationTaskStatus(req: { userId?: number, projectId?: number }) {
    const userId = req.userId ?? 'all'
    const projectId = req.projectId
    let key = `user_${userId}`
    if (projectId != null) {
      key += `_${projectId}`
    }
    const task = taskExecutor.get(DOMAIN_EXPIRE_TASK_TYPE, key)
    return task
  }

  async startSyncExpirationTask(req: { userId?: number, projectId?: number }) {
    const userId = req.userId
    const projectId = req.projectId
    let key = `user_${userId ?? 'all'}`
    if (projectId != null) {
      key += `_${projectId}`
    }
    taskExecutor.start(new BackTask({
      type: DOMAIN_EXPIRE_TASK_TYPE,
      key,
      title: `同步注册域名过期时间(${key}))`,
      run: async (task: BackTask) => {
        await this._syncDomainsExpirationDate({ userId, projectId, task })
        if (userId != null) {
          await this.startCheckDomainExpiration({ userId, projectId })
        }
      }
    }))
  }

  private async _syncDomainsExpirationDate(req: { userId?: number, projectId?: number, task: BackTask }) {

    //同步所有域名的过期时间
    const pager = new Pager({
      pageNo: 1,
      pageSize: 100,
    })

    const tldClient = new TldClient();
    const query: any = {
      challengeType: "dns",
    }
    if (req.userId != null) {
      query.userId = req.userId
    }
    if (req.projectId != null) {
      query.projectId = req.projectId
    }
    const getDomainPage = async (pager: Pager) => {
      const pageRes = await this.page({
        query: query,
        // buildQuery(bq) {
        //   bq.andWhere(" (expiration_date is null or expiration_date < :now) ", { now: dayjs().add(1, 'month').valueOf() })
        // },
        page: {
          offset: pager.getOffset(),
          limit: pager.pageSize,
        }
      })
      req.task.total = pageRes.total
      return {
        list: pageRes.records,
        total: pageRes.total,
      }
    }

    const itemHandle = async (item: any) => {
      req.task.incrementCurrent()
      try {
        const res = await tldClient.getDomainExpirationDate(item.domain)
        const { expirationDate, registrationDate } = res
        if (!expirationDate) {
          req.task.addError(`【${item.domain}】获取域名${item.domain}过期时间失败`)
          return
        }
        logger.info(`【${item.domain}】更新域名过期时间:${dayjs(expirationDate).format('YYYY-MM-DD')}`)
        const updateObj: any = {
          id: item.id,
          expirationDate: expirationDate,
          registrationDate: registrationDate,
        }
        //更新
        await super.update(updateObj)
      } catch (error) {
        const errorMsg = `【${item.domain}】${error.message ?? error}`
        req.task.addError(errorMsg)
        logger.error(errorMsg)
      } finally {
        await utils.sleep(1000)
      }
    }

    await doPageTurn({ pager, getPage: getDomainPage, itemHandle: itemHandle })
    const key = `user_${req.userId || 'all'}`
    const log = `同步用户(${key})注册域名过期时间完成(${req.task.getSuccessCount()}个成功，${req.task.getErrorCount()}个失败)`
    logger.info(log)
  }


  public async startCheckDomainExpiration(req: { userId?: number, projectId?: number }) {
    const { userId, projectId } = req
    if (userId == null) {
      throw new Error('userId is required');
    }

    if (projectId && !isEnterprise()) {
      logger.warn(`当前未开启企业模式，跳过检查项目(${projectId})的域名过期时间`)
      return
    }

    const setting = await this.monitorSettingGet({ userId, projectId })
    if (!setting || !setting.enabled) {
      return
    }

    const jobHistory: any = {
      userId,
      projectId,
      type: DOMAIN_EXPIRE_CHECK_TYPE,
      title: `检查注册域名过期时间`,
      startAt: dayjs().valueOf(),
      result: "start",
    }
    await this.jobHistoryService.add(jobHistory)

    const expireDays = setting.willExpireDays || 30
    const ltTime = dayjs().add(expireDays, 'day').valueOf()

    const total = await this.repository.count({
      where:{
        userId,
        projectId,
        disabled: false,
      }
    })
    //开始检查域名过期时间
    const list = await this.repository.find({
      where: {
        userId,
        projectId,
        disabled: false,
        expirationDate: LessThan(ltTime)
      }
    })

    const now = dayjs().valueOf()
    let willExpireDomains = []
    let hasExpireDomains = []

    for (const item of list) {
      const { expirationDate } = item
      const leftDays = dayjs(expirationDate).diff(dayjs(), 'day')
      //@ts-ignore
      item.leftDays = leftDays
      if (expirationDate < now) {
        hasExpireDomains.push(item)
      } else {
        willExpireDomains.push(item)
      }
    }

    const title = `域名过期检查：即将过期 ${willExpireDomains.length} 个域名，已过期 ${hasExpireDomains.length} 个域名，共 ${total} 个域名`

    try {
      await this.jobHistoryService.update({
        id: jobHistory.id,
        content: title,
        result: "done",
        endAt: dayjs().valueOf(),
      })

    } catch (error) {
      logger.error(`更新域名过期检查任务状态失败:${error.message ?? error}`)
    }

    if (list.length == 0) {
      //没有过期域名  不发通知
      return
    }

    //发送通知
    const willExpireDomainsStr = willExpireDomains.map(item => `${item.domain} (剩余${item.leftDays}天)`).join('\n  ')
    const hasExpireDomainsStr = hasExpireDomains.map(item => `${item.domain} (已过期${item.leftDays}天)`).join('\n  ')
    const content = `您有域名即将过期，请尽快续费

即将过期域名: ${willExpireDomains.length} 个 (有效期<${expireDays}天)
  ${willExpireDomainsStr}

已过期域名: ${hasExpireDomains.length} 个
  ${hasExpireDomainsStr}`
    const taskService = this.taskServiceBuilder.create({ userId: userId, projectId: projectId });

    const notificationService = await taskService.getNotificationService()
    const url = await notificationService.getBindUrl("#/certd/cert/domain");
    await notificationService.send({
      id: setting.notificationId,
      useDefault: true,
      logger: logger,
      body: {
        title: title,
        content: content,
        url: url,
        errorMessage: title,
        notificationType: DOMAIN_EXPIRE_CHECK_TYPE,
        willExpireDomains,
        hasExpireDomains,
      }
    })

  }


  public async monitorSettingGet(req: { userId?: number, projectId?: number }) {
    const { userId, projectId } = req
    const setting = await this.userSettingService.getSetting<UserDomainMonitorSetting>(userId, projectId, UserDomainMonitorSetting)
    return setting || {}
  }

  public async monitorSettingSave(req: { userId?: number, projectId?: number, setting?: any }) {
    const { userId, projectId, setting } = req
    const bean: UserDomainMonitorSetting = new UserDomainMonitorSetting()
    merge(bean, setting)
    await this.userSettingService.saveSetting<UserDomainMonitorSetting>(userId, projectId, bean)
    await this.registerMonitorCron({ userId, projectId })
  }

  public async registerMonitorCron(req: { userId?: number, projectId?: number }) {
    const { userId, projectId } = req
    const setting = await this.monitorSettingGet(req)
    const key = `${DOMAIN_EXPIRE_CHECK_TYPE}:${userId}_${projectId || ''}`
    this.cron.remove(key)
    if (setting.enabled) {
      this.cron.register({
        cron: setting.cron,
        name: key,
        job: async () => {
          await this.startCheckDomainExpiration({ userId, projectId })
        },
      })
    }
  }
}
