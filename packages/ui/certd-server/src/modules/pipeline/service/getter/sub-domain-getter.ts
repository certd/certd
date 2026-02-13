import { ISubDomainsGetter } from "@certd/plugin-cert";
import { SubDomainService } from "../sub-domain-service.js";
import { DomainService } from "../../../cert/service/domain-service.js";

export class SubDomainsGetter implements ISubDomainsGetter {
  userId: number;
  projectId: number;
  subDomainService: SubDomainService;
  domainService: DomainService;

  constructor(userId: number, projectId: number, subDomainService: SubDomainService, domainService: DomainService) {
    this.userId = userId;
    this.projectId = projectId;
    this.subDomainService = subDomainService;
    this.domainService = domainService;
  }

  async getSubDomains() {
    return await this.subDomainService.getListByUserId(this.userId, this.projectId)
  }

  async hasSubDomain(fullDomain: string) {
    let arr = fullDomain.split(".")
    const subDomains = await this.getSubDomains()
    if (subDomains && subDomains.length > 0) {
      const fullDomainDot = "." + fullDomain;
      for (const subDomain of subDomains) {
        if (fullDomainDot.endsWith("." + subDomain)) {
          //找到子域名托管
          return subDomain;
        }

        if (subDomain.startsWith("*.")) {
          //如果子域名配置的是泛域名，说明这一层及以下的子域名都是托管的
          //以fullDomain在这一层的子域名作为返回值
          const nonStarDomain = subDomain.slice(1)
          if (fullDomainDot.endsWith(nonStarDomain)) {
            //提取fullDomain在这一层的子域名
            const fullArr = arr.reverse()
            const subArr = subDomain.split(".").reverse()
            let strBuilder = ""
            for (let i =0 ;i<subArr.length;i++) {
              if (strBuilder) {
                strBuilder = fullArr[i] + "." + strBuilder
              } else {
                strBuilder = fullArr[i]
              }
            }
            return strBuilder
          }
        }

      }
    }
    while (arr.length > 0) {
      const subDomain = arr.join(".")
      const domain = await this.domainService.findOne({
        where: {
          userId: this.userId,
          domain: subDomain,
          challengeType: "dns",
        }
      })
      if (domain) {
        return subDomain
      }
      arr = arr.slice(1)
    }
    return null
  }

}
