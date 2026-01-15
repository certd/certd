import { Provide, Scope, ScopeEnum } from '@midwayjs/core';
import { pluginGroups, pluginRegistry } from '@certd/pipeline';
import { cloneDeep } from 'lodash-es';

@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class BuiltInPluginService {
  getList() {
    const collection = pluginRegistry.storage;
    let list = [];
    for (const key in collection) {
      const Plugin = collection[key];
      if (Plugin?.define?.deprecated) {
        continue;
      }
      //@ts-ignore
      if(Plugin.define?.type && Plugin.define?.type.toLowerCase() !== 'builtin'){
        continue;
      }
      list.push({ ...Plugin.define, key });
    }
    list = list.sort((a, b) => {
      return (a.order ?? 10 )- (b.order ?? 10);
    });
    return list;
  }

  getGroups() {
    const groups:any = cloneDeep(pluginGroups);
    for (const key in groups) {
      const group = groups[key];
      group.plugins = group.plugins.sort((a, b) => {
        return (a.order ?? 10 )- (b.order ?? 10);
      });
    }
    return groups;
  }

  getByType(type: string) {
    return pluginRegistry.getDefine(type);
  }
}
