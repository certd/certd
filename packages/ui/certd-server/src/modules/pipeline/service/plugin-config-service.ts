import { Provide, Scope, ScopeEnum } from '@midwayjs/core';
import { IPluginConfigService } from '@certd/pipeline';

/**
 * 授权
 */
@Provide()
@Scope(ScopeEnum.Singleton)
export class PluginConfigService implements IPluginConfigService {
  getPluginConfig(pluginName: string) {
    return Promise.resolve({});
  }
}
