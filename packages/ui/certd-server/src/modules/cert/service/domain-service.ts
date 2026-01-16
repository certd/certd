import {Inject, Provide, Scope, ScopeEnum} from '@midwayjs/core';
import {InjectEntityModel} from '@midwayjs/typeorm';
import {In, Not, Repository} from 'typeorm';
import {AccessService, BaseService} from '@certd/lib-server';
import {DomainEntity} from '../entity/domain.js';
import {SubDomainService} from "../../pipeline/service/sub-domain-service.js";
import {createDnsProvider, DomainParser} from "@certd/plugin-lib";
import {DomainVerifiers} from "@certd/plugin-cert";
import { SubDomainsGetter } from '../../pipeline/service/getter/sub-domain-getter.js';
import { CnameRecordService } from '../../cname/service/cname-record-service.js';
import { CnameRecordEntity } from "../../cname/entity/cname-record.js";
import { http, logger, utils } from '@certd/basic';
import { TaskServiceBuilder } from '../../pipeline/service/getter/task-service-getter.js';
import { Pager } from '@certd/pipeline';

 export interface SyncFromProviderReq {
  userId: number;
  dnsProviderType: string;
  dnsProviderAccessId: string;
}

/**
 *
 */
@Provide()
@Scope(ScopeEnum.Request, {allowDowngrade: true})
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
    if (param.userId == null ){
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
  async getDomainVerifiers(userId: number, domains: string[]):Promise<DomainVerifiers> {

    const mainDomainMap:Record<string, string> = {}
    const subDomainGetter = new SubDomainsGetter(userId, this.subDomainService)
    const domainParser = new DomainParser(subDomainGetter)

    const mainDomains = []
    for (const domain of domains) {
      const mainDomain = await domainParser.parse(domain);
      mainDomainMap[domain] = mainDomain;
      mainDomains.push(mainDomain)
    }

    //匹配DNS记录
    let allDomains = [...domains,...mainDomains]
    //去重
    allDomains = [...new Set(allDomains)]

    //从 domain 表中获取配置
    const domainRecords = await this.find({
      where: {
        domain: In(allDomains),
        userId,
        disabled:false,
      }
    })

    const dnsMap = domainRecords.filter(item=>item.challengeType === 'dns').reduce((pre, item) => {
      pre[item.domain] = item
      return pre
    }, {})

    const httpMap = domainRecords.filter(item=>item.challengeType === 'http').reduce((pre, item) => {
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
    const domainVerifiers:DomainVerifiers = {}

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
      const cnameRecord:CnameRecordEntity = cnameMap[domain]
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

  

  async syncFromProvider(req: SyncFromProviderReq) {
    const { userId, dnsProviderType, dnsProviderAccessId } = req;
    const subDomainGetter = new SubDomainsGetter(userId, this.subDomainService)
    const domainParser = new DomainParser(subDomainGetter)
    const serviceGetter = this.taskServiceBuilder.create({ userId });
    const access = await this.accessService.getById(dnsProviderAccessId, userId);
    const context = { access, logger, http, utils, domainParser, serviceGetter };
    // 翻页查询dns的记录
    const dnsProvider =  await createDnsProvider({dnsProviderType,context})
    
    const pager = new Pager({
      pageNo: 1,
      pageSize: 100,
    })
    const challengeType = "dns"

    const importDomain =  async(domainRecord: any) =>{
      const domain = domainRecord.domain
      const old = await this.findOne({
        where: {
          domain,
          userId,
        }
      })
      if (old) {
        //更新
        await this.update({
          id: old.id,
          dnsProviderType,
          dnsProviderAccess: dnsProviderAccessId,
          challengeType,
        })
      } else {
        //添加
        await this.add({
          userId,
          domain,
          dnsProviderType,
          dnsProviderAccess: dnsProviderAccessId,
          challengeType,
        })
      }
    }
    const start = async ()=>{
      let count = 0
      while(true){
        const pageRes = await dnsProvider.getDomainListPage(pager)
        if(!pageRes || !pageRes.list || pageRes.list.length === 0){
          //遍历完成
          break
        }
        //处理
        for (const domainRecord of pageRes.list) {
          if (domainRecord.thirdDns) {
            //域名由第三方dns解析，不导入
            continue
          }
          await importDomain(domainRecord)
        }

        count += pageRes.list.length
        if(pageRes.total>0 && count >= pageRes.total){
          //遍历完成
          break
        }
        pager.pageNo++
      }
    }

    start()

  }
}
