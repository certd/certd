import { Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { accessRegistry, notificationRegistry, pluginGroups, pluginRegistry } from "@certd/pipeline";
import { dnsProviderRegistry } from "@certd/plugin-cert";
import { addonRegistry } from "@certd/lib-server";
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
    // 各注册表补 pluginType，供内置插件按类型查询/筛选
    const pluginList = this.getList().map(item => {
      return {
        ...item,
        pluginType: "deploy",
      };
    });
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
    const notificationList = notificationRegistry.getDefineList().map(item => {
      return {
        ...item,
        pluginType: "notification",
      };
    });
    const addonList = (addonRegistry.getDefineList?.() || []).map(item => {
      return {
        ...item,
        pluginType: "addon",
      };
    });
    const list = [...pluginList, ...accessList, ...dnsProviderList, ...notificationList, ...addonList];
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
