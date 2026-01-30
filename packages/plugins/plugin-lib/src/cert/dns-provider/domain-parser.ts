import { IDomainParser, ISubDomainsGetter } from "./api";
//@ts-ignore
import psl from "psl";
import { ILogger, utils, logger as globalLogger } from "@certd/basic";
import { resolveDomainBySoaRecord } from "@certd/acme-client";

export function parseDomainByPsl(fullDomain: string) {
  const parsed = psl.parse(fullDomain) as psl.ParsedDomain;
  if (parsed.error) {
    throw new Error(`解析${fullDomain}域名失败:` + JSON.stringify(parsed.error));
  }
  return parsed;
}

export class DomainParser implements IDomainParser {
  subDomainsGetter: ISubDomainsGetter;
  logger: ILogger;
  constructor(subDomainsGetter: ISubDomainsGetter, logger?: ILogger) {
    this.subDomainsGetter = subDomainsGetter;
    this.logger = logger || globalLogger;
  }

  parseDomainByPsl(fullDomain: string) {
    return parseDomainByPsl(fullDomain).domain as string;
  }

  async parse(fullDomain: string) {
    //如果是ip
    if (utils.domain.isIp(fullDomain)) {
      return fullDomain;
    }

    this.logger.info(`查找主域名:${fullDomain}`);
    const cacheKey = `domain_parse:${fullDomain}`;
    const value = utils.cache.get(cacheKey);
    if (value) {
      this.logger.info(`从缓存获取到主域名:${fullDomain}->${value}`);
      return value;
    }

    //检查是否有子域名托管
    const subDomain = await this.subDomainsGetter.hasSubDomain(fullDomain);
    if (subDomain) {
      utils.cache.set(cacheKey, subDomain, {
        ttl: 60 * 1000,
      });
      this.logger.info(`获取到托管域名:${fullDomain}->${subDomain}`);
      return subDomain;
    }
    // if (subDomains && subDomains.length > 0) {
    //   const fullDomainDot = "." + fullDomain;
    //   for (const subDomain of subDomains) {
    //     if (fullDomainDot.endsWith("." + subDomain)) {
    //       //找到子域名托管
    //       utils.cache.set(cacheKey, subDomain, {
    //         ttl: 60 * 1000,
    //       });
    //       this.logger.info(`获取到子域名托管域名:${fullDomain}->${subDomain}`);
    //       return subDomain;
    //     }
    //   }
    // }

    const res = this.parseDomainByPsl(fullDomain);
    this.logger.info(`从psl获取主域名:${fullDomain}->${res}`);

    let soaManDomain = null;
    try {
      const mainDomain = await resolveDomainBySoaRecord(fullDomain);
      if (mainDomain) {
        this.logger.info(`从SOA获取到主域名:${fullDomain}->${mainDomain}`);
        soaManDomain = mainDomain;
      }
    } catch (e) {
      this.logger.error("从SOA获取主域名失败", e.message);
    }
    if (soaManDomain && soaManDomain !== res) {
      this.logger.warn(`SOA获取的主域名（${soaManDomain}）和psl获取的主域名(${res})不一致，请确认是否有设置子域名托管`);
    }

    return res;
  }
}
