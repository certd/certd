export type Registrable = {
  name: string;
  title: string;
  desc?: string;
};

export type RegistryItem<T> = {
  define: Registrable;
  target: T;
};
export class Registry<T> {
  storage: {
    [key: string]: RegistryItem<T>;
  } = {};

  register(key: string, value: RegistryItem<T>) {
    if (!key || value == null) {
      return;
    }
    this.storage[key] = value;
  }

  get(name: string): RegistryItem<T> {
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
