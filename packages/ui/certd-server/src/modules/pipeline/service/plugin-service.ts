import { Provide, Scope, ScopeEnum } from "@midwayjs/decorator";
import { pluginRegistry } from '@certd/pipeline';
@Provide()
@Scope(ScopeEnum.Singleton)
export class PluginService {
  getList() {
    const collection = pluginRegistry.storage;
    const list = [];
    for (const key in collection) {
      const Plugin = collection[key];
      list.push({ ...Plugin.define, key });
    }
    return list;
  }
}
