import { LocalCache, logger } from "@certd/basic";
import dnsSdk, { AnyRecord } from "dns";
import { LookupAddress } from "node:dns";

const dns = dnsSdk.promises;

export class DnsCustom {
  private resolver: dnsSdk.promises.Resolver;
  // private cache = new LRUCache<string, any>({
  //   max: 1000,
  //   ttl: 1000 * 60 * 5,
  // });

  constructor(dnsServers: string[]) {
    const resolver = new dns.Resolver();
    resolver.setServers(dnsServers);
    this.resolver = resolver;
  }

  // async lookup(hostname:string,options?:{ family: any, hints: number, all: boolean }):Promise<LookupAddress[]>{
  //   const cacheKey = hostname + JSON.stringify(options)
  //   let res = this.cache.get(cacheKey)
  //   if (res){
  //     return res
  //   }
  //   res = await this.doLookup(hostname,options)
  //   this.cache.set(cacheKey,res)
  //   return res
  // }
  async lookup(hostname: string, options?: { family: any; hints: number; all: boolean }): Promise<LookupAddress[]> {
    // { family: undefined, hints: 0, all: true }
    let v4: LookupAddress[] = [];
    let v6: LookupAddress[] = [];
    const errors = [];
    const queryV6 = async () => {
      try {
        const list = await this.resolver.resolve6(hostname);
        if (list && list.length > 0) {
          v6 = list.map(item => {
            return {
              address: item,
              family: 6,
            };
          });
        }
      } catch (e) {
        logger.warn("query v6 error", e);
        errors.push(e);
      }
    };
    const queryV4 = async () => {
      try {
        const list = await this.resolver.resolve4(hostname);
        if (list && list.length > 0) {
          v4 = list.map(item => {
            return {
              address: item,
              family: 4,
            };
          });
        }
      } catch (e) {
        logger.warn("query v4 error", e);
        errors.push(e);
      }
    };

    const queries: Promise<any>[] = [];

    const { family, all } = options;
    if (all) {
      queries.push(queryV6());
      queries.push(queryV4());
    } else {
      if (family === 6) {
        queries.push(queryV6());
      }
      if (family === 4) {
        queries.push(queryV4());
      }
    }
    await Promise.all(queries);
    const res = [...v4, ...v6];
    if (res.length === 0) {
      if (errors.length > 0) {
        const e = new Error(errors[0]);
        // @ts-ignore
        e.errors = errors;
        throw e;
      }
    }
    return res;
  }

  async resolve4(hostname: string): Promise<string[]> {
    return await this.resolver.resolve4(hostname);
  }
  async resolve6(hostname: string): Promise<string[]> {
    return await this.resolver.resolve6(hostname);
  }
  async resolveAny(hostname: string): Promise<AnyRecord[]> {
    return await this.resolver.resolveAny(hostname);
  }

  async resolveCname(hostname: string): Promise<string[]> {
    return await this.resolver.resolveCname(hostname);
  }
}

export class DnsContainer {
  bucket: LocalCache<DnsCustom> = new LocalCache();

  constructor() {}
  getDns(server: string[]) {
    const key = server.join(",");
    let dns = this.bucket.get(key);
    if (dns) {
      return dns;
    }
    dns = new DnsCustom(server);
    this.bucket.set(key, dns);
    return dns;
  }
}

export const dnsContainer = new DnsContainer();
