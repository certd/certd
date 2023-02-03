export type Registrable = {
  name: string;
  title: string;
  desc?: string;
};

export type RegistryItem = {
  define: Registrable;
  target: any;
};
export class Registry {
  storage: {
    [key: string]: RegistryItem;
  } = {};

  register(key: string, value: RegistryItem) {
    if (!key || value == null) {
      return;
    }
    this.storage[key] = value;
  }

  get(name: string): RegistryItem {
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
      const define = this.getDefine(key);
      if (define) {
        list.push({ ...define, key });
      }
    }
    return list;
  }

  getDefine(key: string) {
    const item = this.storage[key];
    if (!item) {
      return;
    }
    return item.define;
  }
}
