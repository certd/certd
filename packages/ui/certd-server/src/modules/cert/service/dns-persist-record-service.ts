import { BaseService } from "@certd/lib-server";
import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { InjectEntityModel } from "@midwayjs/typeorm";
import { In, Repository } from "typeorm";
import { createChallengeFn } from "@certd/acme-client";
import { AccessService } from "@certd/lib-server";
import { http, logger, utils } from "@certd/basic";
import { createDnsProvider, DomainParser } from "@certd/plugin-lib";
import { DnsPersistRecordEntity } from "../entity/dns-persist-record.js";
import { TaskServiceBuilder } from "../../pipeline/service/getter/task-service-getter.js";
import { DomainEntity } from "../entity/domain.js";

export function buildDnsPersistRecordValue(req: { issuer?: string; accountUri: string; wildcard?: boolean; persistUntil?: number }) {
  const parts = [req.issuer || "letsencrypt.org", `accounturi=${req.accountUri}`];
  if (req.wildcard !== false) {
    parts.push("policy=wildcard");
  }
  if (req.persistUntil) {
    parts.push(`persistUntil=${req.persistUntil}`);
  }
  return parts.join("; ");
}

export type DnsPersistRecordBuildReq = {
  domain: string;
  caType?: string;
  acmeAccountAccessId?: number;
  commonAcmeAccountAccessId?: number;
  wildcard?: boolean;
  persistUntil?: number;
};

@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class DnsPersistRecordService extends BaseService<DnsPersistRecordEntity> {
  @InjectEntityModel(DnsPersistRecordEntity)
  repository: Repository<DnsPersistRecordEntity>;

  @InjectEntityModel(DomainEntity)
  domainRepository: Repository<DomainEntity>;

  @Inject()
  accessService: AccessService;

  @Inject()
  taskServiceBuilder: TaskServiceBuilder;

  lastDeleteMessage = "";

  //@ts-ignore
  getRepository() {
    return this.repository;
  }

  normalizeDomain(domain: string) {
    return domain?.replace(/^\*\./, "");
  }

  private async parseMainDomain(domain: string, userId?: number, projectId?: number) {
    if (this.taskServiceBuilder && userId != null) {
      const taskService = this.taskServiceBuilder.create({ userId, projectId });
      const subDomainsGetter = await taskService.getSubDomainsGetter();
      const domainParser = new DomainParser(subDomainsGetter, logger);
      return await domainParser.parse(domain);
    }
    const parts = domain.split(".");
    return parts.length > 2 ? parts.slice(-2).join(".") : domain;
  }

  private buildRelativeHostRecord(domain: string, mainDomain: string) {
    let prefix = domain;
    if (domain === mainDomain) {
      prefix = "";
    } else if (domain.endsWith(`.${mainDomain}`)) {
      prefix = domain.substring(0, domain.length - mainDomain.length - 1);
    }
    return prefix ? `_validation-persist.${prefix}` : "_validation-persist";
  }

  private async buildFullHostRecord(record: Pick<DnsPersistRecordEntity, "domain" | "hostRecord" | "userId" | "projectId" | "mainDomain">) {
    if (record.hostRecord === `_validation-persist.${record.domain}` || record.hostRecord.endsWith(`.${record.domain}`)) {
      return record.hostRecord;
    }
    const mainDomain = record.mainDomain || (await this.parseMainDomain(record.domain, record.userId, record.projectId));
    return `${record.hostRecord}.${mainDomain}`;
  }

  private parseAcmeAccount(account: string | any) {
    if (!account) {
      throw new Error("ACME账号授权缺少账号信息，请重新生成ACME账号");
    }
    const parsed = typeof account === "string" ? JSON.parse(account) : account;
    if (!parsed.accountKey || !parsed.accountUri) {
      throw new Error("ACME账号授权无效，请重新生成ACME账号");
    }
    return parsed;
  }

  async getAcmeAccount(req: DnsPersistRecordBuildReq & { userId: number; projectId?: number }) {
    const accessId = req.acmeAccountAccessId || req.commonAcmeAccountAccessId;
    if (!accessId) {
      throw new Error("请选择ACME账号");
    }
    let access: any;
    if (req.commonAcmeAccountAccessId) {
      const entity = await this.accessService.info(accessId);
      if (!entity || entity.userId !== 0 || entity.type !== "acmeAccount") {
        throw new Error("公共ACME账号不存在");
      }
      access = await this.accessService.getAccessById(accessId, false);
    } else {
      access = await this.accessService.getAccessById(accessId, true, req.userId, req.projectId);
    }
    const account = this.parseAcmeAccount(access.account);
    const caType = req.caType || account.caType;
    if (caType && account.caType && caType !== account.caType) {
      throw new Error("ACME账号授权与颁发机构不匹配");
    }
    return {
      accessId,
      caType,
      account,
    };
  }

  async buildRecord(req: { domain: string; accountUri: string; wildcard?: boolean; persistUntil?: number; userId?: number; projectId?: number }) {
    const domain = this.normalizeDomain(req.domain);
    const mainDomain = await this.parseMainDomain(domain, req.userId, req.projectId);
    return {
      mainDomain,
      hostRecord: this.buildRelativeHostRecord(domain, mainDomain),
      recordValue: buildDnsPersistRecordValue({
        ...req,
        wildcard: true,
      }),
    };
  }

  async buildRecordByAcmeAccount(req: DnsPersistRecordBuildReq & { userId: number; projectId?: number }) {
    const { account, caType, accessId } = await this.getAcmeAccount(req);
    const record = await this.buildRecord({
      domain: req.domain,
      accountUri: account.accountUri,
      wildcard: true,
      persistUntil: req.persistUntil,
      userId: req.userId,
      projectId: req.projectId,
    });
    return {
      ...record,
      domain: this.normalizeDomain(req.domain),
      mainDomain: record.mainDomain,
      caType,
      acmeAccountAccessId: accessId,
      accountUri: account.accountUri,
      policy: "wildcard",
      persistUntil: req.persistUntil,
      status: "pending",
      disabled: false,
    };
  }
  async add(param: any) {
    const record = await this.buildRecordByAcmeAccount(param);
    const userProjectQuery = this.buildUserProjectQuery(param.userId, param.projectId);
    const exists = await this.findOne({
      where: {
        domain: record.domain,
        caType: record.caType,
        acmeAccountAccessId: record.acmeAccountAccessId,
        ...userProjectQuery,
      },
    });
    if (exists) {
      if (exists.policy !== "wildcard") {
        await this.upgradeToWildcardRecord(exists, record);
        return await this.info(exists.id);
      }
      if (exists.status !== "valid" && !exists.dnsProviderAccess) {
        await this.tryAutoCreateDnsTxt(exists.id);
        return await this.info(exists.id);
      }
      return exists;
    }
    const result = await super.add({
      ...param,
      ...record,
    });
    await this.tryAutoCreateDnsTxt(result.id);
    return await this.info(result.id);
  }

  async update(param: any) {
    const old = await this.info(param.id);
    if (!old) {
      throw new Error("DNS持久验证记录不存在");
    }
    if (param.domain || param.caType || param.acmeAccountAccessId || param.commonAcmeAccountAccessId || param.persistUntil != null || param.wildcard != null) {
      const record = await this.buildRecordByAcmeAccount({
        domain: param.domain || old.domain,
        caType: param.caType || old.caType,
        acmeAccountAccessId: param.acmeAccountAccessId || old.acmeAccountAccessId,
        commonAcmeAccountAccessId: param.commonAcmeAccountAccessId,
        wildcard: true,
        persistUntil: param.persistUntil ?? old.persistUntil,
        userId: old.userId,
        projectId: old.projectId,
      });
      param = {
        ...param,
        ...record,
      };
    }
    await super.update(param);
    if (param.domain || param.caType || param.acmeAccountAccessId || param.commonAcmeAccountAccessId || param.persistUntil != null || param.wildcard != null) {
      await this.tryAutoCreateDnsTxt(param.id);
    }
  }

  async checkRecord(req: { hostRecord: string; recordValue: string }) {
    const { walkTxtRecord } = createChallengeFn();
    const values = await walkTxtRecord(req.hostRecord);
    return values.includes(req.recordValue);
  }

  async getByDomain(req: DnsPersistRecordBuildReq & { userId: number; projectId?: number; createOnNotFound?: boolean }) {
    const account = await this.getAcmeAccount(req);
    const domain = this.normalizeDomain(req.domain);
    const userProjectQuery = this.buildUserProjectQuery(req.userId, req.projectId);
    let record = await this.findOne({
      where: {
        domain,
        caType: account.caType,
        acmeAccountAccessId: account.accessId,
        ...userProjectQuery,
      },
    });
    if (!record && req.createOnNotFound) {
      record = await this.add({
        ...req,
        domain,
        caType: account.caType,
        acmeAccountAccessId: account.accessId,
      });
    } else if (record && record.policy !== "wildcard") {
      const wildcardRecord = await this.buildRecordByAcmeAccount({
        ...req,
        domain,
        caType: account.caType,
        acmeAccountAccessId: account.accessId,
        persistUntil: req.persistUntil ?? record.persistUntil,
      });
      await this.upgradeToWildcardRecord(record, wildcardRecord);
      record = await this.info(record.id);
    } else if (record && record.status !== "valid" && !record.dnsProviderAccess) {
      await this.tryAutoCreateDnsTxt(record.id);
      record = await this.info(record.id);
    }
    return record;
  }

  private async upgradeToWildcardRecord(exists: DnsPersistRecordEntity, wildcardRecord: Partial<DnsPersistRecordEntity>) {
    await super.update({
      id: exists.id,
      hostRecord: wildcardRecord.hostRecord,
      recordValue: wildcardRecord.recordValue,
      mainDomain: wildcardRecord.mainDomain,
      policy: "wildcard",
      persistUntil: wildcardRecord.persistUntil ?? exists.persistUntil,
      status: "pending",
      recordRes: null,
    });
  }

  async verify(id: number) {
    const record = await this.info(id);
    if (!record) {
      throw new Error("DNS持久验证记录不存在");
    }
    const ok = await this.checkRecord({
      hostRecord: await this.buildFullHostRecord(record),
      recordValue: record.recordValue,
    });
    await this.update({
      id: record.id,
      status: ok ? "valid" : "failed",
    });
    return ok;
  }

  async triggerVerify(id: number) {
    await super.update({
      id,
      status: "validating",
    });
    setTimeout(() => {
      this.verify(id).catch(async (e: any) => {
        logger.error(`DNS持久验证记录后台校验失败:${e.message || e}`);
        await super.update({
          id,
          status: "failed",
        });
      });
    }, 0);
    return true;
  }

  private async findDomainDnsProvider(record: DnsPersistRecordEntity) {
    const taskService = this.taskServiceBuilder.create({ userId: record.userId, projectId: record.projectId });
    const subDomainsGetter = await taskService.getSubDomainsGetter();
    const domainParser = new DomainParser(subDomainsGetter, logger);
    const mainDomain = record.mainDomain || (await domainParser.parse(record.domain));
    const domains = [...new Set([record.domain, mainDomain].filter(Boolean))];
    const userProjectQuery = this.buildUserProjectQuery(record.userId, record.projectId);
    const list = await this.domainRepository.find({
      where: {
        domain: In(domains),
        ...userProjectQuery,
        challengeType: "dns",
        disabled: false,
      },
    });
    const matched = list.find(item => item.domain === record.domain) || list.find(item => item.domain === mainDomain);
    if (!matched) {
      return null;
    }
    return {
      dnsProviderType: matched.dnsProviderType,
      dnsProviderAccess: matched.dnsProviderAccess,
    };
  }

  private async resolveDnsProvider(record: DnsPersistRecordEntity, req: { dnsProviderType?: string; dnsProviderAccess?: number }) {
    if (req.dnsProviderType && req.dnsProviderAccess) {
      return {
        dnsProviderType: req.dnsProviderType,
        dnsProviderAccess: req.dnsProviderAccess,
      };
    }
    const provider = await this.findDomainDnsProvider(record);
    if (!provider) {
      throw new Error("未找到该域名在域名管理中的DNS授权配置，请手动选择DNS服务商和授权");
    }
    return provider;
  }

  private async tryAutoCreateDnsTxt(id: number) {
    const record = await this.info(id);
    if (!record || record.status === "valid") {
      return;
    }
    const provider = await this.findDomainDnsProvider(record);
    if (!provider) {
      return;
    }
    try {
      await this.createDnsTxt({
        id,
        ...provider,
      });
    } catch (e: any) {
      await super.update({
        id,
        status: "failed",
        recordRes: JSON.stringify({
          autoCreateError: e.message || `${e}`,
        }),
      });
    }
  }

  async createDnsTxt(req: { id: number; dnsProviderType?: string; dnsProviderAccess?: number }) {
    const record = await this.info(req.id);
    if (!record) {
      throw new Error("DNS持久验证记录不存在");
    }
    const provider = await this.resolveDnsProvider(record, req);
    const taskService = this.taskServiceBuilder.create({ userId: record.userId, projectId: record.projectId });
    const subDomainsGetter = await taskService.getSubDomainsGetter();
    const domainParser = new DomainParser(subDomainsGetter, logger);
    const access = await this.accessService.getAccessById(provider.dnsProviderAccess, true, record.userId, record.projectId);
    const dnsProvider = await createDnsProvider({
      dnsProviderType: provider.dnsProviderType,
      context: {
        access,
        logger,
        http,
        utils,
        domainParser,
        serviceGetter: taskService,
      },
    });
    const mainDomain = record.mainDomain || (await domainParser.parse(record.domain));
    const fullRecordRaw = await this.buildFullHostRecord(record);
    const fullRecord = dnsProvider.usePunyCode() ? fullRecordRaw : dnsProvider.punyCodeDecode(fullRecordRaw);
    let hostRecord = fullRecord.replace(`${mainDomain}`, "");
    if (hostRecord.endsWith(".")) {
      hostRecord = hostRecord.substring(0, hostRecord.length - 1);
    }
    const recordReq = {
      domain: mainDomain,
      fullRecord,
      hostRecord,
      type: "TXT",
      value: record.recordValue,
    };
    const recordRes = await dnsProvider.createRecord(recordReq);
    const verified = await this.checkRecord({
      hostRecord: await this.buildFullHostRecord(record),
      recordValue: record.recordValue,
    });
    await this.update({
      id: record.id,
      dnsProviderType: provider.dnsProviderType,
      dnsProviderAccess: provider.dnsProviderAccess,
      recordRes: JSON.stringify({ recordReq, recordRes }),
      status: verified ? "valid" : "validating",
    });
    return {
      recordReq,
      recordRes,
      verified,
    };
  }

  async delete(ids: string | any[], where?: any) {
    const idList = this.resolveIdArr(ids);
    const messages: string[] = [];
    for (const id of idList) {
      const record = await this.info(id);
      if (!record) {
        continue;
      }
      messages.push(`DNS持久验证记录已删除，请到域名供应商删除TXT记录：${record.hostRecord} => ${record.recordValue}`);
    }
    this.lastDeleteMessage = messages.join("\n");
    return await super.delete(ids, where);
  }
}
