import { http, logger } from "@certd/basic";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";

import type { DomainInfo } from "./tld-client.js";

dayjs.extend(customParseFormat);

export class RdapSsClient {
  private static readonly API = "https://rdap.ss/api/query";
  private static readonly RATE_LIMITS = [
    { windowMs: 60 * 1000, max: 30 },
    { windowMs: 60 * 60 * 1000, max: 1200 },
    { windowMs: 24 * 60 * 60 * 1000, max: 12000 },
  ];
  private static readonly MAX_WAIT_MS = 3 * 60 * 1000;
  private static readonly DATA_RETENTION_MS = 24 * 60 * 60 * 1000;
  private static requestTimes: number[] = [];

  async getDomainInfo(domain: string): Promise<DomainInfo> {
    await this.waitRateLimit();

    const result = await http.request({
      url: `${RdapSsClient.API}?q=${encodeURIComponent(domain)}`,
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

  private async waitRateLimit() {
    while (true) {
      const now = Date.now();
      RdapSsClient.requestTimes = RdapSsClient.requestTimes.filter(time => now - time < RdapSsClient.DATA_RETENTION_MS);

      const waitMs = RdapSsClient.RATE_LIMITS.reduce((maxWaitMs, limit) => {
        const times = RdapSsClient.requestTimes.filter(time => now - time < limit.windowMs);
        if (times.length < limit.max) {
          return maxWaitMs;
        }
        const earliestTime = Math.min(...times);
        return Math.max(maxWaitMs, earliestTime + limit.windowMs - now);
      }, 0);

      if (waitMs <= 0) {
        RdapSsClient.requestTimes.push(now);
        return;
      }

      if (waitMs > RdapSsClient.MAX_WAIT_MS) {
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
}
