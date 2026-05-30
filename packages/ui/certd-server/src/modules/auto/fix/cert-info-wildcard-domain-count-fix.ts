import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { logger } from "@certd/basic";
import { CertInfoService } from "../../monitor/service/cert-info-service.js";

@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class CertInfoWildcardDomainCountFix {
  @Inject()
  certInfoService: CertInfoService;

  async init() {
    if (!this.certInfoService) {
      return;
    }
    try {
      const list = await this.certInfoService.find({
        select: {
          id: true,
          domains: true,
          wildcardDomainCount: true,
        },
      });
      let fixedCount = 0;
      for (const item of list) {
        if (!item.domains) {
          continue;
        }
        const wildcardDomainCount = this.certInfoService.countWildcardDomains(item.domains.split(","));
        if ((item.wildcardDomainCount ?? 0) === wildcardDomainCount) {
          continue;
        }
        await this.certInfoService.update({
          id: item.id,
          wildcardDomainCount,
        });
        fixedCount++;
      }
      if (fixedCount > 0) {
        logger.info(`已修复证书泛域名数量历史数据，数量=${fixedCount}`);
      }
      return true;
    } catch (e: any) {
      logger.error("修复证书泛域名数量历史数据失败", e);
    }
    return false;
  }
}
