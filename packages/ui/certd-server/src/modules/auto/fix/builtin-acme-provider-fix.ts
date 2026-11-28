import { logger } from "@certd/basic";
import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { SysPrivateSettings, SysSettingsService } from "@certd/lib-server";

/**
 * 启动时补齐缺失的内置ACME颁发机构。
 * 仅处理一次：后续应由设置保存/管理流程保持内置项存在。
 */
@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class BuiltinAcmeProviderFix {
  @Inject()
  sysSettingsService: SysSettingsService;

  async init() {
    try {
      const privateSetting = await this.sysSettingsService.getPrivateSettings();
      const normalized = SysPrivateSettings.ensureBuiltInAcmeProviders(privateSetting.customAcmeProviders);
      if (JSON.stringify(normalized) !== JSON.stringify(privateSetting.customAcmeProviders || [])) {
        privateSetting.customAcmeProviders = normalized;
        await this.sysSettingsService.savePrivateSettings(privateSetting);
        logger.info(`[fix] builtin acme providers restored count=${normalized.length}`);
      }
      return true;
    } catch (e: any) {
      logger.error(`[fix] builtin acme providers restore failed: ${e?.message || e}`);
      return false;
    }
  }
}
