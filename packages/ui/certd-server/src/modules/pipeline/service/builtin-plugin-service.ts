import { Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { accessRegistry, pluginGroups, pluginRegistry } from "@certd/pipeline";
import { dnsProviderRegistry } from "@certd/plugin-cert";
import { cloneDeep } from "lodash-es";

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
      if (Plugin.define?.type && Plugin.define?.type.toLowerCase() !== "builtin") {
        continue;
      }
      list.push({ ...Plugin.define, key });
    }
    list = list.sort((a, b) => {
      return (a.order ?? 10) - (b.order ?? 10);
    });
    return list;
  }

  getAllList() {
    const pluginList = this.getList();
    const accessList = accessRegistry.getDefineList().map(item => {
      return {
        ...item,
        pluginType: "access",
      };
    });
    const dnsProviderList = dnsProviderRegistry.getDefineList().map(item => {
      return {
        ...item,
        pluginType: "dnsProvider",
      };
    });
    const list = [...pluginList, ...accessList, ...dnsProviderList];
    return list.sort((a, b) => {
      return (a.order ?? 10) - (b.order ?? 10);
    });
  }

  getGroups() {
    const groups: any = cloneDeep(pluginGroups);
    for (const key in groups) {
      const group = groups[key];
      group.plugins = group.plugins.sort((a, b) => {
        return (a.order ?? 10) - (b.order ?? 10);
      });
    }
    return groups;
  }

  getByType(type: string) {
    return pluginRegistry.getDefine(type);
  }
}
