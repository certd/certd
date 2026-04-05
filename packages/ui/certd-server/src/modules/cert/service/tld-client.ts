
import { http, logger } from '@certd/basic';
import { parseDomainByPsl } from "@certd/plugin-lib";
import dayjs from 'dayjs';

export interface DomainInfo {
  expirationDate?: number;
  registrationDate?: number;
}

export class TldClient {
  private rdapMap: Record<string, string> = {}
  private isInitialized = false;

  constructor() {
  }

  async init() {
    if (this.isInitialized) {
      return;
    }
    const dnsJson = await http.request({
      url: "https://data.iana.org/rdap/dns.json",
      method: "GET",
    })
    for (const item of dnsJson.services) {
      const suffixes = item[0]
      const urls = item[1]
      for (const suffix of suffixes) {
        this.rdapMap[suffix] = urls[0]
      }
    }
    this.isInitialized = true;
  }

  async getDomainExpirationDate(domain: string): Promise<DomainInfo> {
    await this.init();
    
    const parsed = parseDomainByPsl(domain)
    const mainDomain = parsed.domain || ''
    if (mainDomain !== domain) {
      const message= `【${domain}】为子域名，无法获取过期时间`
      logger.warn(message)
      throw new Error(message)
    }
    
    try {
      return await this.getDomainExpirationByRdap(domain, parsed.tld || '')
    } catch (error) {
      logger.error(error.message)
      return await this.getDomainExpirationByWhoiser(domain)
    }
  }

  private async getDomainExpirationByRdap(domain: string, suffix: string): Promise<DomainInfo> {
    const rdapUrl = this.rdapMap[suffix]
    if (!rdapUrl) {
      throw new Error(`【${domain}】未找到${suffix}的rdap地址`)
    }
    
    const rdap = await http.request({
      url: `${rdapUrl}domain/${domain}`,
      method: "GET",
    })

    let res: DomainInfo = {}
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

  private async getDomainExpirationByWhoiser(domain: string): Promise<DomainInfo> {
    const whoiser = await import("whoiser")
    const result = await whoiser.whoisDomain(domain, {
      follow: 2,
      timeout: 5000
    })
    
    let res: DomainInfo = {}
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
      const data = result[server] as any
      if (data['Expiry Date']) {
        res.expirationDate = dayjs(data['Expiry Date']).valueOf()
      }
      if (data['Created Date']) {
        res.registrationDate = dayjs(data['Created Date']).valueOf()
      }
      if (res.expirationDate && res.registrationDate) {
        break
      }
    }
    
    if (!res.expirationDate) {
      throw new Error(`【${domain}】whois查询未找到过期时间`)
    }
    
    return res
  }
}