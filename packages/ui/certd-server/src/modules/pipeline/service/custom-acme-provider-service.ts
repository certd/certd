import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { CustomAcmeProvider, SysPrivateSettings, SysSettingsService } from "@certd/lib-server";

/**
 * 证书颁发机构服务（内置 + 自定义ACME）
 *
 * 读取系统「流水线设置」中的 customAcmeProviders 配置（内置项 + 管理员配置的自定义项），
 * 供证书申请任务、ACME账号授权按 sslProvider 获取对应的 Directory URL、反向代理、needEAB 等配置。
 */
@Provide("CustomAcmeProviderService")
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class CustomAcmeProviderService {
  @Inject()
  sysSettingsService: SysSettingsService;

  /**
   * 获取全部证书颁发机构配置（内置 + 自定义ACME）
   */
  async getAll(): Promise<CustomAcmeProvider[]> {
    const setting = await this.sysSettingsService.getSetting<SysPrivateSettings>(SysPrivateSettings);
    return setting.customAcmeProviders || [];
  }

  /**
   * 按 sslProvider 唯一标识获取证书颁发机构配置
   */
  async getBySslProvider(sslProvider: string): Promise<CustomAcmeProvider | undefined> {
    if (!sslProvider) {
      return undefined;
    }
    const list = await this.getAll();
    return list.find(item => item.sslProvider === sslProvider);
  }
}
