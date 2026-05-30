import { createChallengeFn, getAuthoritativeDnsResolver } from "@certd/acme-client";
import { cache, http, isDev, logger, utils } from "@certd/basic";
import { AccessService, BaseService, PlusService, SysInstallInfo, SysSettingsService, ValidateException } from "@certd/lib-server";
import { CnameProvider, CnameRecord } from "@certd/pipeline";
import { createDnsProvider, DomainParser, IDnsProvider } from "@certd/plugin-cert";
import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { InjectEntityModel } from "@midwayjs/typeorm";
import punycode from "punycode.js";
import { Repository } from "typeorm";
import { BackTask, taskExecutor } from "../../basic/service/task-executor.js";
import { TaskServiceBuilder } from "../../pipeline/service/getter/task-service-getter.js";
import { SubDomainService } from "../../pipeline/service/sub-domain-service.js";
import { CnameProviderEntity } from "../entity/cname-provider.js";
import { CnameRecordEntity, CnameRecordStatusType } from "../entity/cname-record.js";
import { CnameProviderService } from "./cname-provider-service.js";
import { CommonDnsProvider } from "./common-provider.js";

type CnameCheckCacheValue = {
  validating: boolean;
  pass: boolean;
  recordReq?: any;
  recordRes?: any;
  startTime: number;
  intervalId?: NodeJS.Timeout;
  dnsProvider?: IDnsProvider;
};

/**
 * 授权
 */
@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class CnameRecordService extends BaseService<CnameRecordEntity> {
  @InjectEntityModel(CnameRecordEntity)
  repository: Repository<CnameRecordEntity>;

  @Inject()
  cnameProviderService: CnameProviderService;
  @Inject()
  sysSettingsService: SysSettingsService;

  @Inject()
  accessService: AccessService;

  @Inject()
  plusService: PlusService;

  @Inject()
  subDomainService: SubDomainService;

  @Inject()
  taskServiceBuilder: TaskServiceBuilder;

  //@ts-ignore
  getRepository() {
    return this.repository;
  }

  /**
   * 新增
   * @param param 数据
   */
  async add(param: any): Promise<CnameRecordEntity> {
    if (!param.domain) {
      throw new ValidateException("域名不能为空");
    }
    if (param.userId == null) {
      throw new ValidateException("userId不能为空");
    }
    if (param.domain.startsWith("*.")) {
      param.domain = param.domain.substring(2);
    }
    param.domain = param.domain.trim();
    const info = await this.getRepository().findOne({ where: { domain: param.domain, userId: param.userId } });
    if (info) {
      return info;
    }

    let cnameProvider: CnameProviderEntity = null;
    if (!param.cnameProviderId) {
      //获取默认的cnameProviderId
      cnameProvider = await this.cnameProviderService.getByPriority();
      if (cnameProvider == null) {
        throw new ValidateException("找不到CNAME服务，请先前往“系统管理->CNAME服务设置”添加CNAME服务");
      }
    } else {
      cnameProvider = await this.cnameProviderService.info(param.cnameProviderId);
    }
    await this.cnameProviderChanged(param.userId, param, cnameProvider);

    param.status = "cname";
    const { id } = await super.add(param);
    return await this.info(id);
  }

  private async cnameProviderChanged(userId: number, param: any, cnameProvider: CnameProviderEntity) {
    param.cnameProviderId = cnameProvider.id;

    const taskService = this.taskServiceBuilder.create({ userId: userId });
    const subDomainGetter = await taskService.getSubDomainsGetter();
    const domainParser = new DomainParser(subDomainGetter);

    const realDomain = await domainParser.parse(param.domain);
    const prefix = param.domain.replace(realDomain, "");
    let hostRecord = `_acme-challenge.${prefix}`;
    if (hostRecord.endsWith(".")) {
      hostRecord = hostRecord.substring(0, hostRecord.length - 1);
    }
    param.hostRecord = hostRecord;
    param.mainDomain = realDomain;

    const randomKey = utils.id.simpleNanoId(6).toLowerCase();

    const userIdHex = utils.hash.toHex(userId);
    let userKeyHash = "";
    const installInfo = await this.sysSettingsService.getSetting<SysInstallInfo>(SysInstallInfo);
    userKeyHash = `${installInfo.siteId}_${userIdHex}_${randomKey}`;
    userKeyHash = utils.hash.md5(userKeyHash).substring(0, 10);
    logger.info(`userKeyHash:${userKeyHash},subjectId:${installInfo.siteId},randomKey:${randomKey},userIdHex:${userIdHex}`);
    const cnameKey = `${userKeyHash}-${userIdHex}-${randomKey}`;
    const safeDomain = param.domain.replaceAll(".", "-");
    param.recordValue = `${safeDomain}.${cnameKey}.${cnameProvider.domain}`;
  }

  async update(param: any) {
    if (!param.id) {
      throw new ValidateException("id不能为空");
    }
    //hostRecord包含所有权校验信息，不允许用户修改hostRecord
    delete param.hostRecord;

    const old = await this.info(param.id);
    if (!old) {
      throw new ValidateException("数据不存在");
    }
    if (param.domain && old.domain !== param.domain) {
      throw new ValidateException("域名不允许修改");
    }
    if (param.cnameProviderId && old.cnameProviderId !== param.cnameProviderId) {
      const cnameProvider = await this.cnameProviderService.info(param.cnameProviderId);
      await this.cnameProviderChanged(old.userId, param, cnameProvider);
      param.status = "cname";
    }
    return await super.update(param);
  }

  // async validate(id: number) {
  //   const info = await this.info(id);
  //   if (info.status === 'success') {
  //     return true;
  //   }
  //
  //   //开始校验
  //   // 1.  dnsProvider
  //   // 2.  添加txt记录
  //   // 3.  检查原域名是否有cname记录
  // }

  async getWithAccessByDomain(domain: string, userId: number, projectId?: number) {
    const record: CnameRecord = await this.getByDomain(domain, userId, projectId);
    if (record.cnameProvider.id > 0) {
      //自定义cname服务
      record.cnameProvider.access = await this.accessService.getAccessById(record.cnameProvider.accessId, false);
    } else {
      record.commonDnsProvider = new CommonDnsProvider({
        config: record.cnameProvider,
        plusService: this.plusService,
      });
    }

    return record;
  }

  async getByDomain(domain: string, userId: number, projectId?: number, createOnNotFound = true) {
    if (!domain) {
      throw new ValidateException("domain不能为空");
    }
    if (userId == null) {
      throw new ValidateException("userId不能为空");
    }
    let record = await this.getRepository().findOne({ where: { domain, userId, projectId } });
    if (record == null) {
      if (createOnNotFound) {
        record = await this.add({ domain, userId, projectId });
      } else {
        throw new ValidateException(`找不到${domain}的CNAME记录`);
      }
    }

    await this.fillMainDomain(record);

    const provider = await this.cnameProviderService.info(record.cnameProviderId);
    if (provider == null) {
      throw new ValidateException(`找不到${domain}的CNAME服务`);
    }

    return {
      ...record,
      cnameProvider: {
        ...provider,
      } as CnameProvider,
    } as CnameRecord;
  }

  async fillMainDomain(record: CnameRecordEntity, update = true) {
    const notMainDomain = !record.mainDomain;
    const hasErrorMainDomain = record.mainDomain && !record.mainDomain.includes(".");
    if (notMainDomain || hasErrorMainDomain) {
      let domainPrefix = record.hostRecord.replace("_acme-challenge", "");
      if (domainPrefix.startsWith(".")) {
        domainPrefix = domainPrefix.substring(1);
      }

      if (domainPrefix) {
        const prefixStr = domainPrefix + ".";
        record.mainDomain = record.domain.substring(prefixStr.length);
      } else {
        record.mainDomain = record.domain;
      }

      if (update) {
        await this.update({
          id: record.id,
          mainDomain: record.mainDomain,
        });
      }
    }
  }

  /**
   * 验证是否配置好cname
   * @param id
   */
  async verify(id: number) {
    const { walkTxtRecord } = createChallengeFn({ logger });
    const bean = await this.info(id);
    if (!bean) {
      throw new ValidateException(`CnameRecord:${id} 不存在`);
    }
    if (bean.status === "valid") {
      return true;
    }

    await this.getByDomain(bean.domain, bean.userId, bean.projectId);
    const taskService = this.taskServiceBuilder.create({ userId: bean.userId, projectId: bean.projectId });
    const subDomainGetter = await taskService.getSubDomainsGetter();
    const domainParser = new DomainParser(subDomainGetter);

    const cacheKey = `cname.record.verify.${bean.id}`;

    let value: CnameCheckCacheValue = cache.get(cacheKey);
    if (!value) {
      value = {
        validating: false,
        pass: false,
        startTime: new Date().getTime(),
      };
    }
    let ttl = 5 * 60 * 1000;
    if (isDev()) {
      ttl = 30 * 1000;
    }
    const testRecordValue = `certd-cname-verify-${bean.id}`;

    const buildDnsProvider = async () => {
      const cnameProvider = await this.cnameProviderService.info(bean.cnameProviderId);
      if (cnameProvider == null) {
        throw new ValidateException(`CNAME服务:${bean.cnameProviderId} 已被删除，请修改CNAME记录，重新选择CNAME服务`);
      }
      if (cnameProvider.disabled === true) {
        throw new Error(`CNAME服务:${bean.cnameProviderId} 已被禁用`);
      }

      if (cnameProvider.id < 0) {
        //公共CNAME
        return new CommonDnsProvider({
          config: cnameProvider,
          plusService: this.plusService,
        });
      }

      const record = await this.getWithAccessByDomain(bean.domain, bean.userId, bean.projectId);

      const access = record.cnameProvider.access;
      const context = { access, logger, http, utils, domainParser, serviceGetter: taskService };
      const dnsProvider: IDnsProvider = await createDnsProvider({
        dnsProviderType: cnameProvider.dnsProviderType,
        context,
      });
      return dnsProvider;
    };

    const clearVerifyRecord = async () => {
      cache.delete(cacheKey);
      try {
        let dnsProvider = value.dnsProvider;
        if (!dnsProvider) {
          dnsProvider = await buildDnsProvider();
        }
        await dnsProvider.removeRecord({
          recordReq: value.recordReq,
          recordRes: value.recordRes,
        });
        logger.info("删除CNAME的校验DNS记录成功");
      } catch (e) {
        logger.error(`删除CNAME的校验DNS记录失败， ${e.message}，req:${JSON.stringify(value.recordReq)}，recordRes:${JSON.stringify(value.recordRes)}`, e);
      }
    };

    const checkRecordValue = async () => {
      if (value.pass) {
        return true;
      }
      if (value.startTime + ttl < new Date().getTime()) {
        logger.warn(`cname验证超时,停止检查,${bean.domain} ${testRecordValue}`);
        clearInterval(value.intervalId);
        await this.updateStatus(bean.id, "timeout");
        await clearVerifyRecord();
        return false;
      }

      const originDomain = await domainParser.parse(bean.domain);
      const fullDomain = `${bean.hostRecord}.${originDomain}`;

      logger.info(`检查CNAME配置 ${fullDomain} ${testRecordValue}`);

      //检查是否有重复的acme配置
      await this.checkRepeatAcmeChallengeRecords(fullDomain, bean.recordValue);

      // const txtRecords = await dns.promises.resolveTxt(fullDomain);
      // if (txtRecords.length) {
      //   records = [].concat(...txtRecords);
      // }
      let records: string[] = [];
      try {
        records = await walkTxtRecord(fullDomain);
      } catch (e) {
        logger.error(`获取TXT记录失败，${e.message}`);
      }
      logger.info(`检查到TXT记录 ${JSON.stringify(records)}`);
      const success = records.includes(testRecordValue);
      if (success) {
        clearInterval(value.intervalId);
        logger.info(`检测到CNAME配置,修改状态 ${fullDomain} ${testRecordValue}`);
        await this.updateStatus(bean.id, "valid", "");
        value.pass = true;
        await clearVerifyRecord();
        return success;
      }
    };

    if (value.validating) {
      // lookup recordValue in dns
      return await checkRecordValue();
    }

    cache.set(cacheKey, value, {
      ttl: ttl,
    });

    const domain = await domainParser.parse(bean.recordValue);
    const fullRecord = bean.recordValue;
    const hostRecord = fullRecord.replace(`.${domain}`, "");
    const req = {
      domain: domain,
      fullRecord: fullRecord,
      hostRecord: hostRecord,
      type: "TXT",
      value: testRecordValue,
    };

    const dnsProvider = await buildDnsProvider();
    if (dnsProvider.usePunyCode()) {
      //是否需要中文转英文
      req.domain = dnsProvider.punyCodeEncode(req.domain);
      req.fullRecord = dnsProvider.punyCodeEncode(req.fullRecord);
      req.hostRecord = dnsProvider.punyCodeEncode(req.hostRecord);
      req.value = dnsProvider.punyCodeEncode(req.value);
    }
    const recordRes = await dnsProvider.createRecord(req);
    value.dnsProvider = dnsProvider;
    value.validating = true;
    value.recordReq = req;
    value.recordRes = recordRes;
    await this.updateStatus(bean.id, "validating", "");

    value.intervalId = setInterval(async () => {
      try {
        await checkRecordValue();
      } catch (e) {
        logger.error("检查cname出错：", e);
        await this.updateError(bean.id, e.message);
      }
    }, 10000);
  }

  async updateStatus(id: number, status: CnameRecordStatusType, error?: string) {
    const updated: any = { status };
    if (error != null) {
      updated.error = error;
    }
    await this.getRepository().update(id, updated);
  }

  async updateError(id: number, error: string) {
    await this.getRepository().update(id, { error });
  }

  async checkRepeatAcmeChallengeRecords(acmeRecordDomain: string, targetCnameDomain: string) {
    let dnsResolver = null;
    try {
      dnsResolver = await getAuthoritativeDnsResolver(acmeRecordDomain);
    } catch (e) {
      logger.error(`获取${acmeRecordDomain}的权威DNS服务器失败，${e.message}`);
      return;
    }
    let cnameRecords = [];
    try {
      cnameRecords = await dnsResolver.resolveCname(acmeRecordDomain);
    } catch (e) {
      logger.error(`查询CNAME记录失败：${e.message}`);
      return;
    }
    targetCnameDomain = targetCnameDomain.toLowerCase();
    targetCnameDomain = punycode.toASCII(targetCnameDomain);
    if (cnameRecords.length > 0) {
      for (const cnameRecord of cnameRecords) {
        if (cnameRecord.toLowerCase() !== targetCnameDomain) {
          //确保只有一个cname记录
          throw new Error(`${acmeRecordDomain}存在多个CNAME记录，请删除多余的CNAME记录：${cnameRecord}`);
        }
      }
    }

    // 确保权威服务器里面没有纯粹的TXT记录
    let txtRecords = [];
    try {
      const txtRecordRes = await dnsResolver.resolveTxt(acmeRecordDomain);

      if (txtRecordRes && txtRecordRes.length > 0) {
        logger.info(`找到 ${txtRecordRes.length} 条 TXT记录（ ${acmeRecordDomain}）`);
        logger.info(`TXT records: ${JSON.stringify(txtRecords)}`);
        txtRecords = txtRecords.concat(...txtRecordRes);
      }
    } catch (e) {
      logger.error(`查询Txt记录失败：${e.message}`);
    }

    if (txtRecords.length === 0) {
      //如果权威服务器中查不到txt，无需继续检查
      return;
    }

    const { walkTxtRecord } = createChallengeFn({ logger });

    if (cnameRecords.length > 0) {
      // 从cname记录中获取txt记录
      // 对比是否存在，如果不存在于cname中获取的txt中，说明本体有创建多余的txt记录
      const res = await walkTxtRecord(cnameRecords[0]);
      if (res.length > 0) {
        for (const txtRecord of txtRecords) {
          if (!res.includes(txtRecord)) {
            throw new Error(`${acmeRecordDomain}存在多个TXT记录，请删除多余的TXT记录:${txtRecord}`);
          }
        }
      }
    }
  }

  async resetStatus(id: number) {
    if (!id) {
      throw new ValidateException("id不能为空");
    }
    await this.getRepository().update(id, { status: "cname", mainDomain: "" });
  }

  async doImport(req: { userId: number; projectId: number; domainList: string; cnameProviderId: any }) {
    const { userId, projectId, cnameProviderId, domainList } = req;
    const domains = domainList
      .split("\n")
      .map(item => item.trim())
      .filter(item => item.length > 0);
    if (domains.length === 0) {
      throw new ValidateException("域名列表不能为空");
    }
    if (!req.cnameProviderId) {
      throw new ValidateException("CNAME服务提供商不能为空");
    }

    taskExecutor.start(
      new BackTask({
        type: "cnameImport",
        key: "user_" + userId,
        title: "导入CNAME记录",
        run: async task => {
          await this._import({ userId, projectId, domains, cnameProviderId }, task);
        },
      })
    );
  }

  async _import(req: { userId: number; projectId: number; domains: string[]; cnameProviderId: any }, task: BackTask) {
    const userId = req.userId;
    for (const domain of req.domains) {
      const old = await this.getRepository().findOne({
        where: {
          userId: req.userId,
          domain,
          projectId: req.projectId,
        },
      });
      if (old) {
        logger.warn(`域名${domain}已存在，跳过`);
      }
      //开始导入
      try {
        await this.add({
          userId,
          domain: domain,
          projectId: req.projectId,
          cnameProviderId: req.cnameProviderId,
        });
      } catch (e) {
        logger.error(`导入域名${domain}失败：${e.message}`);
      }
    }
  }
}
