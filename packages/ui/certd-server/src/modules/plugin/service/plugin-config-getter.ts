import { Inject, Provide, Scope, ScopeEnum } from '@midwayjs/core';
import { IPluginConfigService, PluginConfig } from '@certd/pipeline';
import { PluginConfigService } from './plugin-config-service.js';

@Provide()
@Scope(ScopeEnum.Singleton)
export class PluginConfigGetter implements IPluginConfigService {
  @Inject()
  pluginConfigService: PluginConfigService;

  async getPluginConfig(pluginName: string): Promise<PluginConfig> {
    const res = await this.pluginConfigService.getPluginConfig({
      name: pluginName,
      type: 'builtIn',
    });
    return {
      name: res.name,
      disabled: res.disabled,
      sysSetting: res.sysSetting,
    };
  }
}
