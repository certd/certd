import { logger } from "@certd/basic";
import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { LocalCaProviderSyncService } from "../../local-ca/service/local-ca-provider-sync-service.js";

/**
 * 启动时把本地中间CA与系统自定义ACME颁发机构对账：
 * 采纳 legacy「从本地CA快速添加」条目（补 localCaId 标记），按CA当前状态重建同步集合，清理孤儿。
 */
@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class LocalCaProviderAdoptFix {
  @Inject()
  providerSync: LocalCaProviderSyncService;

  async init() {
    try {
      await this.providerSync.reconcileAll();
      return true;
    } catch (e: any) {
      logger.error(`[local-ca] provider adopt/reconcile failed: ${e?.message || e}`);
      return false;
    }
  }
}