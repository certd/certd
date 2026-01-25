import { http, logger, utils } from '@certd/basic';
import { AccessService, BaseService } from '@certd/lib-server';
import { doPageTurn, Pager, PageRes } from '@certd/pipeline';
import { DomainVerifiers } from "@certd/plugin-cert";
import { createDnsProvider, dnsProviderRegistry, DomainParser, parseDomainByPsl } from "@certd/plugin-lib";
import { Inject, Provide, Scope, ScopeEnum } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import dayjs from 'dayjs';
import { In, Not, Repository } from 'typeorm';
import { BackTask, taskExecutor } from '../../basic/service/task-executor.js';
import { CnameRecordEntity } from "../../cname/entity/cname-record.js";
import { CnameRecordService } from '../../cname/service/cname-record-service.js';
import { UserDomainImportSetting } from '../../mine/service/models.js';
import { UserSettingsService } from '../../mine/service/user-settings-service.js';
import { SubDomainsGetter } from '../../pipeline/service/getter/sub-domain-getter.js';
import { TaskServiceBuilder } from '../../pipeline/service/getter/task-service-getter.js';
import { SubDomainService } from "../../pipeline/service/sub-domain-service.js";
import { DomainEntity } from '../entity/domain.js';

export interface SyncFromProviderReq {
  userId: number;
  dnsProviderType: string;
  dnsProviderAccessId: number;
}


const DOMAIN_IMPORT_TASK_TYPE = 'domainImportTask'
const DOMAIN_EXPIRE_TASK_TYPE = 'domainExpirationSyncTask'


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
  async getDomainVerifiers(userId: number, domains: string[]): Promise<DomainVerifiers> {

    const mainDomainMap: Record<string, string> = {}
    const subDomainGetter = new SubDomainsGetter(userId, this.subDomainService)
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


  async startDomainImportTask(req: {userId:number,key:string}) {
    const key = req.key
    const setting = await this.userSettingService.getSetting<UserDomainImportSetting>(req.userId, UserDomainImportSetting)

    const item = setting.domainImportList.find(item => item.key === key)
    if (!item) {
      throw new Error(`域名导入任务配置（${key}）还未注册`)
    }
    const { dnsProviderType, dnsProviderAccessId,title } = item

    taskExecutor.start(new BackTask({
      type: DOMAIN_IMPORT_TASK_TYPE,  
      key,
      title: title,
      run: async (task: BackTask) => {
        await this._syncFromProvider({
          userId: req.userId,
          dnsProviderType,
          dnsProviderAccessId,
        }, task)
      },
    }))
  }

  private async _syncFromProvider(req: SyncFromProviderReq, task: BackTask) {
    const { userId, dnsProviderType, dnsProviderAccessId } = req;
    const subDomainGetter = new SubDomainsGetter(userId, this.subDomainService)
    const domainParser = new DomainParser(subDomainGetter)
    const serviceGetter = this.taskServiceBuilder.create({ userId });
    const access = await this.accessService.getById(dnsProviderAccessId, userId);
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
      const domain = domainRecord.domain

      const old = await this.findOne({
        where: {
          domain,
          userId,
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

  async getDomainImportTaskStatus(req:{userId?:number}) {
    const userId = req.userId || 0

    const setting = await this.userSettingService.getSetting<UserDomainImportSetting>(userId, UserDomainImportSetting)
    const list= setting?.domainImportList || []

    const taskList:any = []

    for (const item of list) {
      const {  key } = item
      
      const task =  taskExecutor.get(DOMAIN_IMPORT_TASK_TYPE,key)

      taskList.push({
        ...item,
        task:task,
      })
    }
    return taskList
  }

  async getProviderTitle(req:{userId?:number,dnsProviderType:string,dnsProviderAccessId:number}) {
    const userId = req.userId || 0
    const { dnsProviderType, dnsProviderAccessId} = req
    const dnsProviderDefine = dnsProviderRegistry.getDefine(dnsProviderType)
    if (!dnsProviderDefine) {
      throw new Error(`该域名提供商（${dnsProviderType}）不存在，请检查是否已被注册`)
    }
    const access = await this.accessService.getSimpleInfo(dnsProviderAccessId)
    if (!access || access.userId !== userId) {
      throw new Error(`该授权（${dnsProviderAccessId}）不存在，请检查是否已被删除`)
    }
    return {
      title: `${dnsProviderDefine.title}_${access.name || ''}`,
      //@ts-ignore
      icon: dnsProviderDefine.icon || '',
    }
  }

  async addDomainImportTask(req:{userId?:number,dnsProviderType:string,dnsProviderAccessId:number,index?:number}) {
    const userId = req.userId || 0
    const { dnsProviderType, dnsProviderAccessId,index=0 } = req    
    const key = `user_${userId}_${dnsProviderType}_${dnsProviderAccessId}`

    const {title,icon} = await this.getProviderTitle(req)


    const setting = await this.userSettingService.getSetting<UserDomainImportSetting>(userId, UserDomainImportSetting)
    setting.domainImportList = setting.domainImportList || []
    if (setting.domainImportList.find(item => item.key === key)) {
      throw new Error(`该域名导入任务${key}已存在`)
    }

    const access = await this.accessService.getAccessById(dnsProviderAccessId, true, userId)
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
    await this.userSettingService.saveSetting(userId, setting)

    return item
  }

  async deleteDomainImportTask(req:{userId?:number,key:string}) {
    const userId = req.userId || 0
    const { key } = req

    const setting = await this.userSettingService.getSetting<UserDomainImportSetting>(userId, UserDomainImportSetting)
    setting.domainImportList = setting.domainImportList || []
    const index = setting.domainImportList.findIndex(item => item.key === key)
    if (index === -1) {
      throw new Error(`该域名导入任务${key}不存在`)
    }
    setting.domainImportList.splice(index, 1)
    taskExecutor.clear(DOMAIN_IMPORT_TASK_TYPE,key)
    await this.userSettingService.saveSetting(userId, setting)
  }

  async saveDomainImportTask(req:{userId?:number,dnsProviderType:string,dnsProviderAccessId:number,key?:string}) {
    const userId = req.userId || 0
    const { dnsProviderType, dnsProviderAccessId,key } = req
    const setting = await this.userSettingService.getSetting<UserDomainImportSetting>(userId, UserDomainImportSetting)
    setting.domainImportList = setting.domainImportList || []

    let index = 0
    if (key) {
      index = setting.domainImportList.findIndex(item => item.key === key)
      if (index === -1) {
        throw new Error(`该域名导入任务${key}不存在`)
      }
      await this.deleteDomainImportTask({userId,key})
    }

    await this.addDomainImportTask({userId,dnsProviderType,dnsProviderAccessId,index})
  }



  
  async getSyncExpirationTaskStatus(req:{userId?:number}) {
    const userId = req.userId ?? 'all'
    const key = `user_${userId}`
    const task = taskExecutor.get(DOMAIN_EXPIRE_TASK_TYPE,key)
    return task
  }

  async startSyncExpirationTask(req: { userId?: number }) {
    const userId = req.userId
    const key = `user_${userId ?? 'all'}`
    taskExecutor.start(new BackTask({
      type: DOMAIN_EXPIRE_TASK_TYPE,
      key,
      title: `同步注册域名过期时间(${key}))`,
      run: async (task: BackTask) => {
        await this._syncDomainsExpirationDate({ userId, task })
      }
    }))
  }

  private async _syncDomainsExpirationDate(req: { userId?: number, task: BackTask }) {
    //同步所有域名的过期时间
    const pager = new Pager({
      pageNo: 1,
      pageSize: 100,
    })

    const dnsJson = await http.request({
      url: "https://data.iana.org/rdap/dns.json",
      method: "GET",
    })
    const rdapMap: Record<string, string> = {}
    for (const item of dnsJson.services) {
      //  [["store","work"], ["https://rdap.centralnic.com/store/"]],
      const suffixes = item[0]
      const urls = item[1]
      for (const suffix of suffixes) {
        rdapMap[suffix] = urls[0]
      }
    }

    const getDomainExpirationDate = async (domain: string) => {
      const parsed = parseDomainByPsl(domain)
      const mainDomain = parsed.domain || ''
      if (mainDomain !== domain) {
        req.task.addError(`【${domain}】为子域名，跳过同步`)
        return
      }
      const suffix = parsed.tld || ''
      const rdapUrl = rdapMap[suffix]
      if (!rdapUrl) {
        req.task.addError(`【${domain}】未找到${suffix}的rdap地址`)
        return
      }
      // https://rdap.nic.work/domain/handsfree.work
      const rdap = await http.request({
        url: `${rdapUrl}domain/${domain}`,
        method: "GET",
      })

      let res: any = {}
      const events = rdap.events || []
      for (const item of events) {
        if (item.eventAction === 'expiration') {
          res.expirationDate = dayjs(item.eventDate).valueOf()
        } else if (item.eventAction === 'registration') {
          res.registrationDate = dayjs(item.eventDate).valueOf()
        }
      }
      return res
    }
    const query: any = {
      challengeType: "dns",
    }
    if (req.userId != null) {
      query.userId = req.userId
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
        const res = await getDomainExpirationDate(item.domain)
        if (!res) {
          return
        }
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
      } finally {
        await utils.sleep(1000)
      }
    }

    await doPageTurn({ pager, getPage: getDomainPage, itemHandle: itemHandle })
    const key = `user_${req.userId || 'all'}`
    logger.info(`同步用户(${key})注册域名过期时间完成(${req.task.getSuccessCount()}个成功，${req.task.getErrorCount()}个失败)` )
  }

  
}
