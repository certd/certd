import { IUrlService } from "@certd/pipeline";
import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { SysInstallInfo, SysSettingsService } from "@certd/lib-server";

@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class UrlService implements IUrlService {
  @Inject()
  sysSettingsService: SysSettingsService;

  async getPipelineDetailUrl(pipelineId: number, historyId: number): Promise<string> {
    const installInfo = await this.sysSettingsService.getSetting<SysInstallInfo>(SysInstallInfo);
    let baseUrl = "http://127.0.0.1:7001";
    if (installInfo.bindUrl) {
      baseUrl = installInfo.bindUrl;
    }
    return `${baseUrl}#/certd/pipeline/detail?id=${pipelineId}&historyId=${historyId}`;
  }
}
