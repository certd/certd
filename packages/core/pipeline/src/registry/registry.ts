import { Logger } from "log4js";

export type Registrable = {
  name: string;
  title: string;
  desc?: string;
};

export abstract class AbstractRegistrable<T extends Registrable> {
  // @ts-ignore
  define: T;

  getDefine(): T {
    return this.define;
  }
}
export class Registry<T extends typeof AbstractRegistrable> {
  storage: {
    [key: string]: T;
  } = {};

  install(pluginClass: T) {
    if (pluginClass == null) {
      return;
    }
    // @ts-ignore
    const plugin = new pluginClass();
    delete plugin.define;
    const define = plugin.getDefine();
    let defineName = define.name;
    if (defineName == null) {
      defineName = plugin.name;
    }

    this.register(defineName, pluginClass);
  }

  register(key: string, value: T) {
    if (!key || value == null) {
      return;
    }
    this.storage[key] = value;
  }

  get(name: string) {
    if (!name) {
      throw new Error("插件名称不能为空");
    }

    const plugin = this.storage[name];
    if (!plugin) {
      throw new Error(`插件${name}还未注册`);
    }
    return plugin;
  }

  getStorage() {
    return this.storage;
  }

  getDefineList() {
    const list = [];
    for (const key in this.storage) {
      const PluginClass = this.storage[key];
      // @ts-ignore
      const plugin = new PluginClass();
      list.push({ ...plugin.define, key });
    }
    return list;
  }
}
