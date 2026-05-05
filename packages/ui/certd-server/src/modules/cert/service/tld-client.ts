import { http, logger } from "@certd/basic";
import { parseDomainByPsl } from "@certd/plugin-lib";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";

dayjs.extend(customParseFormat);

export interface DomainInfo {
  expirationDate?: number;
  registrationDate?: number;
}

export class TldClient {
  private static readonly RDAP_SS_API = "https://rdap.ss/api/query";
  private static readonly RDAP_SS_RATE_LIMITS = [
    { windowMs: 60 * 1000, max: 30 },
    { windowMs: 60 * 60 * 1000, max: 1200 },
    { windowMs: 24 * 60 * 60 * 1000, max: 12000 },
  ];
  private static readonly RDAP_SS_MAX_WAIT_MS = 3 * 60 * 1000;
  private static readonly RDAP_SS_DATA_RETENTION_MS = 24 * 60 * 60 * 1000;
  private static rdapSsRequestTimes: number[] = [];

  private rdapMap: Record<string, string> = {};
  private isInitialized = false;

  constructor() {}

  async init() {
    if (this.isInitialized) {
      return;
    }
    const dnsJson = await http.request({
      url: "https://data.iana.org/rdap/dns.json",
      method: "GET",
    });
    for (const item of dnsJson.services) {
      const suffixes = item[0];
      const urls = item[1];
      for (const suffix of suffixes) {
        this.rdapMap[suffix] = urls[0];
      }
    }
    this.isInitialized = true;
  }

  async getDomainExpirationDate(domain: string): Promise<DomainInfo> {
    await this.init();

    const parsed = parseDomainByPsl(domain);
    const mainDomain = parsed.domain || "";
    if (mainDomain !== domain) {
      const message = `【${domain}】为子域名，无法获取过期时间`;
      logger.warn(message);
      throw new Error(message);
    }

    try {
      return await this.getDomainExpirationByRdap(domain, parsed.tld || "");
    } catch (error) {
      logger.error(this.getErrorMessage(error));
    }

    try {
      return await this.getDomainExpirationByWhoiser(domain);
    } catch (error) {
      logger.error(this.getErrorMessage(error));
      return await this.getDomainExpirationByRdapSs(domain);
    }
  }

  private async getDomainExpirationByRdap(domain: string, suffix: string): Promise<DomainInfo> {
    const rdapUrl = this.rdapMap[suffix];
    if (!rdapUrl) {
      throw new Error(`【${domain}】未找到${suffix}的rdap地址`);
    }

    const rdap = await http.request({
      url: `${rdapUrl}domain/${domain}`,
      method: "GET",
    });

    let res: DomainInfo = {};
    const events = rdap.events || [];
    for (const item of events) {
      if (item.eventAction === "expiration") {
        res.expirationDate = dayjs(item.eventDate).valueOf();
      } else if (item.eventAction === "registration") {
        res.registrationDate = dayjs(item.eventDate).valueOf();
      }
    }
    return res;
  }

  private async getDomainExpirationByRdapSs(domain: string): Promise<DomainInfo> {
    await this.waitRdapSsRateLimit();

    const result = await http.request({
      url: `${TldClient.RDAP_SS_API}?q=${encodeURIComponent(domain)}`,
      method: "GET",
      logRes: false,
    });

    if (!result?.success || !result?.data) {
      throw new Error(`【${domain}】rdap.ss查询失败`);
    }

    const data = result.data?.whoisData || result.data?.rawData || {};
    const res: DomainInfo = {};
    const expirationDate = this.parseFirstDate(data, ["Expiry Date", "Expiration Date", "Registry Expiry Date", "expires"]);
    const registrationDate = this.parseFirstDate(data, ["Domain Name Commencement Date", "Created Date", "Creation Date", "Registration Date", "Registered On"]);

    if (expirationDate) {
      res.expirationDate = expirationDate;
    }
    if (registrationDate) {
      res.registrationDate = registrationDate;
    }

    if (!res.expirationDate) {
      throw new Error(`【${domain}】rdap.ss查询未找到过期时间`);
    }

    return res;
  }

  private async getDomainExpirationByWhoiser(domain: string): Promise<DomainInfo> {
    const whoiser = await import("whoiser");
    const result = await whoiser.whoisDomain(domain, {
      follow: 2,
      timeout: 5000,
    });

    let res: DomainInfo = {};
    /**
     * {
  "Domain Status": [
    "ok",
  ],
  "Name Server": [
    "dns21.hichina.com",
    "dns22.hichina.com",
  ],
  text: [
    "",
  ],
  "Domain Name": "docmirror.cn",
  ROID: "20200907s10001s31265717-cn",
  "Registrant Name": "肖君诺",
  "Registrant Email": "252959493@qq.com",
  Registrar: "阿里巴巴云计算（北京）有限公司",
  "Created Date": "2020-09-07 09:22:54",
  "Expiry Date": "2026-09-07 09:22:54",
  DNSSEC: "unsigned",
}
     */

    for (const server in result) {
      const data = result[server] as any;
      if (data["Expiry Date"]) {
        res.expirationDate = dayjs(data["Expiry Date"]).valueOf();
      }
      if (data["Created Date"]) {
        res.registrationDate = dayjs(data["Created Date"]).valueOf();
      }
      if (res.expirationDate && res.registrationDate) {
        break;
      }
    }

    if (!res.expirationDate) {
      throw new Error(`【${domain}】whois查询未找到过期时间`);
    }

    return res;
  }

  private async waitRdapSsRateLimit() {
    while (true) {
      const now = Date.now();
      TldClient.rdapSsRequestTimes = TldClient.rdapSsRequestTimes.filter(time => now - time < TldClient.RDAP_SS_DATA_RETENTION_MS);

      const waitMs = TldClient.RDAP_SS_RATE_LIMITS.reduce((maxWaitMs, limit) => {
        const times = TldClient.rdapSsRequestTimes.filter(time => now - time < limit.windowMs);
        if (times.length < limit.max) {
          return maxWaitMs;
        }
        const earliestTime = Math.min(...times);
        return Math.max(maxWaitMs, earliestTime + limit.windowMs - now);
      }, 0);

      if (waitMs <= 0) {
        TldClient.rdapSsRequestTimes.push(now);
        return;
      }

      if (waitMs > TldClient.RDAP_SS_MAX_WAIT_MS) {
        throw new Error(`rdap.ss查询达到速率限制，等待时间超过3分钟`);
      }

      logger.warn(`rdap.ss查询达到速率限制，将在${waitMs}ms后重试`);
      await this.sleep(waitMs);
    }
  }

  private parseFirstDate(data: Record<string, any>, keys: string[]) {
    for (const key of keys) {
      const value = data[key];
      const values = Array.isArray(value) ? value : [value];
      for (const item of values) {
        const timestamp = this.parseDateValue(item);
        if (timestamp) {
          return timestamp;
        }
      }
    }
  }

  private parseDateValue(value: any) {
    if (!value || typeof value !== "string") {
      return;
    }

    const formats = ["DD-MM-YYYY", "YYYY-MM-DD", "YYYY-MM-DD HH:mm:ss", "YYYY/MM/DD", "YYYY/MM/DD HH:mm:ss", "MMM D YYYY", "MMM D, YYYY"];
    for (const format of formats) {
      const parsed = dayjs(value, format, true);
      if (parsed.isValid()) {
        return parsed.valueOf();
      }
    }

    const parsed = dayjs(value);
    if (parsed.isValid()) {
      return parsed.valueOf();
    }
  }

  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getErrorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
