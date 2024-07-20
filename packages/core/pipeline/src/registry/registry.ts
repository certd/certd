import { logger } from "../utils/index.js";

export type Registrable = {
  name: string;
  title: string;
  desc?: string;
  group?: string;
};

export type RegistryItem<T> = {
  define: Registrable;
  target: T;
};

export type OnRegisterContext<T> = {
  registry: Registry<T>;
  key: string;
  value: RegistryItem<T>;
};
export type OnRegister<T> = (ctx: OnRegisterContext<T>) => void;
export class Registry<T> {
  type = "";
  storage: {
    [key: string]: RegistryItem<T>;
  } = {};

  onRegister?: OnRegister<T>;

  constructor(type: string, onRegister?: OnRegister<T>) {
    this.type = type;
    this.onRegister = onRegister;
  }

  register(key: string, value: RegistryItem<T>) {
    if (!key || value == null) {
      return;
    }
    this.storage[key] = value;
    if (this.onRegister) {
      this.onRegister({
        registry: this,
        key,
        value,
      });
    }
    logger.info(`注册插件:${this.type}:${key}`);
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
