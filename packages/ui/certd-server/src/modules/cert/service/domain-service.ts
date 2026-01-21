import { http, logger, utils } from '@certd/basic';
import { AccessService, BaseService } from '@certd/lib-server';
import { doPageTurn, Pager, PageRes } from '@certd/pipeline';
import { DomainVerifiers } from "@certd/plugin-cert";
import { createDnsProvider, DomainParser, parseDomainByPsl } from "@certd/plugin-lib";
import { Inject, Provide, Scope, ScopeEnum } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import dayjs from 'dayjs';
import { In, Not, Repository } from 'typeorm';
import { CnameRecordEntity } from "../../cname/entity/cname-record.js";
import { CnameRecordService } from '../../cname/service/cname-record-service.js';
import { SubDomainsGetter } from '../../pipeline/service/getter/sub-domain-getter.js';
import { TaskServiceBuilder } from '../../pipeline/service/getter/task-service-getter.js';
import { SubDomainService } from "../../pipeline/service/sub-domain-service.js";
import { DomainEntity } from '../entity/domain.js';
import { BackTask, taskExecutor } from './task-executor.js';

export interface SyncFromProviderReq {
  userId: number;
  dnsProviderType: string;
  dnsProviderAccessId: string;
}



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


  async doSyncFromProvider(req: SyncFromProviderReq) {
    taskExecutor.start('syncFromProviderTask', new BackTask({
      key: `user_${req.userId}`,
      title: `同步用户${req.userId}从域名提供商导入域名`,
      run: async (task: BackTask) => {
        await this._syncFromProvider(req, task)
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

    const importDomain = async (domainRecord: any) => {
      task.incrementCurrent()
      const domain = domainRecord.domain

      const old = await this.findOne({
        where: {
          domain,
          userId,
        }
      })
      if (old) {
        if (old.fromType !== 'auto') {
          //如果是手动的，跳过更新校验配置
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
          fromType: 'auto',
        })
      }
    }
    const batchHandle = async (pageRes: PageRes<any>) => {
        task.setTotal(pageRes.total || 0)
    }
    const start = async () => {
      await doPageTurn({ pager, getPage: dnsProvider.getDomainListPage, itemHandle: importDomain, batchHandle })
    }

    start()

  }

  async doSyncDomainsExpirationDate(req: { userId?: number }) {
    const userId = req.userId
    taskExecutor.start('syncDomainsExpirationDateTask', new BackTask({
      key: `user_${userId}`,
      title: `同步用户(${userId ?? '全部'})注册域名过期时间`,
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
        logger.warn(`${domain}为子域名，跳过同步`)
        return
      }
      const suffix = parsed.tld || ''
      const rdapUrl = rdapMap[suffix]
      if (!rdapUrl) {
        throw new Error(`未找到${suffix}的rdap地址`)
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
    if (req.userId!=null) {
      query.userId = req.userId
    }
    const getDomainPage = async (pager: Pager) => {
      const pageRes = await this.page({
        query: query,
        buildQuery(bq) {
          bq.andWhere(" (expiration_date is null or expiration_date < :now) ", { now: dayjs().add(1, 'month').valueOf() })
        },
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
          logger.error(`获取域名${item.domain}过期时间失败`)
          return
        }
        logger.info(`更新域名${item.domain}过期时间:${dayjs(expirationDate).format('YYYY-MM-DD')}`)
        const updateObj: any = {
          id: item.id,
          expirationDate: expirationDate,
          registrationDate: registrationDate,
        }
        //更新
        await super.update(updateObj)
      } catch (error) {
        logger.error(`更新域名${item.domain}过期时间失败:${error}`)
      } finally {
        await utils.sleep(1000)
      }
    }

    await doPageTurn({ pager, getPage: getDomainPage, itemHandle: itemHandle })
  }
}
