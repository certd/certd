import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { logger } from "@certd/basic";
import { TypeORMDataSourceManager } from "@midwayjs/typeorm";

export function fixSuiteContentWildcardDomainCount(contentValue?: string) {
  if (!contentValue) {
    return null;
  }
  const content = JSON.parse(contentValue);
  if (content.maxWildcardDomainCount != null) {
    return null;
  }
  content.maxWildcardDomainCount = content.maxDomainCount == null || content.maxDomainCount === -1 ? -1 : content.maxDomainCount;
  return JSON.stringify(content);
}

@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class SuiteContentWildcardDomainCountFix {
  @Inject()
  dataSourceManager: TypeORMDataSourceManager;

  async init() {
    if (!this.dataSourceManager) {
      return;
    }
    try {
      const entityManager = this.dataSourceManager.getDataSource("default").manager;
      let fixedCount = 0;
      fixedCount += await this.fixSuiteContentWildcardDomainCountByTable(entityManager, "cd_product");
      fixedCount += await this.fixSuiteContentWildcardDomainCountByTable(entityManager, "cd_user_suite");
      if (fixedCount > 0) {
        logger.info(`已修复套餐最大泛域名数量历史数据，数量=${fixedCount}`);
      }
      return true;
    } catch (e: any) {
      logger.error("修复套餐最大泛域名数量历史数据失败", e);
    }
    return false;
  }

  private async fixSuiteContentWildcardDomainCountByTable(entityManager: any, tableName: string) {
    const list = await entityManager.query(`select id, content from ${tableName}`);
    let fixedCount = 0;
    for (const item of list) {
      const content = fixSuiteContentWildcardDomainCount(item.content);
      if (!content) {
        continue;
      }
      await entityManager.update(tableName, { id: item.id }, { content });
      fixedCount++;
    }
    return fixedCount;
  }
}
