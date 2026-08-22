import { logger } from "@certd/basic";
import { SysSettingsService } from "@certd/lib-server";
import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";

/**
 * 旧版「网络设置-反代设置」（SysPrivateSettings.reverseProxies，已废弃）兼容迁移：
 * 新版本启动时读取旧的反向代理配置，写入 customAcmeProviders 中对应内置颁发机构的 reverseProxy，
 * 以后统一以「流水线设置-自定义ACME管理」中的配置为准。
 */
@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class ReverseProxyMigrateFix {
  @Inject()
  sysSettingsService: SysSettingsService;

  // 旧反代配置的 key 是内置颁发机构域名，映射到对应的 sslProvider
  private readonly domainToProviderMap: Record<string, string> = {
    "acme-v02.api.letsencrypt.org": "letsencrypt",
    "acme-staging-v02.api.letsencrypt.org": "letsencrypt_staging",
    "dv.acme-v02.api.pki.goog": "google",
    "acme.zerossl.com": "zerossl",
    "acme.litessl.com": "litessl",
    "acme.ssl.com": "sslcom",
  };

  async init() {
    try {
      const privateSetting = await this.sysSettingsService.getPrivateSettings();
      const oldReverseProxies = privateSetting.reverseProxies || {};
      const hasOld = Object.values(oldReverseProxies).some((value: any) => !!value);
      if (!hasOld) {
        return true;
      }
      const providers = privateSetting.customAcmeProviders || [];
      let changed = false;
      for (const domain in oldReverseProxies) {
        const reverseProxy = oldReverseProxies[domain];
        if (!reverseProxy) {
          continue;
        }
        const sslProvider = this.domainToProviderMap[domain];
        if (!sslProvider) {
          continue;
        }
        const provider = providers.find(item => item.sslProvider === sslProvider);
        // 未找到对应内置项或已配置反代的不覆盖
        if (!provider || provider.reverseProxy) {
          continue;
        }
        provider.reverseProxy = reverseProxy;
        changed = true;
      }
      if (changed) {
        privateSetting.customAcmeProviders = providers;
        // 清理旧的反代配置字段，以后以 customAcmeProviders 为准
        delete privateSetting.reverseProxies;
        await this.sysSettingsService.savePrivateSettings(privateSetting);
      }
      logger.info("旧网络设置中的ACME反向代理已迁移到自定义ACME配置");
      return true;
    } catch (e: any) {
      logger.error("ACME反向代理配置迁移失败", e);
      return false;
    }
  }
}
