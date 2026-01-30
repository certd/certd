import {ISubDomainsGetter} from "@certd/plugin-cert";
import {SubDomainService} from "../sub-domain-service.js";
import { DomainService } from "../../../cert/service/domain-service.js";

export class SubDomainsGetter implements ISubDomainsGetter {
  userId: number;
  subDomainService: SubDomainService;
  domainService: DomainService;

  constructor(userId: number, subDomainService: SubDomainService, domainService: DomainService) {
    this.userId = userId;
    this.subDomainService = subDomainService;
    this.domainService = domainService;
  }

  async getSubDomains() {
    return await this.subDomainService.getListByUserId(this.userId)
  }

  async hasSubDomain(fullDomain: string) {
    const subDomains = await this.getSubDomains()
     if (subDomains && subDomains.length > 0) {
      const fullDomainDot = "." + fullDomain;
      for (const subDomain of subDomains) {
        if (fullDomainDot.endsWith("." + subDomain)) {
          //找到子域名托管
          return subDomain;
        }
      }
    }
    let arr = fullDomain.split(".")
    while(arr.length>0){
      const subDomain = arr.join(".")
      const domain = await this.domainService.findOne({
        where: {
          userId: this.userId,
          domain: subDomain,
          challengeType: "dns",
        }
      })
      if(domain){
        return subDomain
      }
       arr = arr.slice(1)
    }
    return null
  }

}
