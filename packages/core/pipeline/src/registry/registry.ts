import { isDev, logger } from "@certd/basic";

export type Registrable = {
  name: string;
  title: string;
  desc?: string;
  group?: string;
  deprecated?: string;
  order?: number;
  icon?: string;
};
export type TargetGetter<T> = () => Promise<T>;
export type RegistryItem<T> = {
  define: Registrable;
  target: TargetGetter<T>;
};

export type OnRegisterContext<T> = {
  registry: Registry<T>;
  key: string;
  value: RegistryItem<T>;
};
export type OnRegister<T> = (ctx: OnRegisterContext<T>) => void;
export class Registry<T = any> {
  type = "";
  storage: {
    [key: string]: RegistryItem<T>;
  } = {};

  onRegister?: OnRegister<T>;
  onUnRegister?: OnRegister<T>;

  constructor(type: string, onRegister?: OnRegister<T>, onUnRegister?: OnRegister<T>) {
    this.type = type;
    this.onRegister = onRegister;
    this.onUnRegister = onUnRegister;
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

  unRegister(key: string) {
    if (this.onUnRegister) {
      this.onUnRegister({
        registry: this,
        key,
        value: this.storage[key],
      });
    }
    delete this.storage[key];
    logger.info(`反注册插件:${this.type}:${key}`);
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

  getDefineList(prefix?: string) {
    let list = [];
    if (prefix) {
      prefix = prefix + ":";
    }
    for (const key in this.storage) {
      if (prefix && !key.startsWith(prefix)) {
        continue;
      }
      const define = this.getDefine(key);
      if (define) {
        if (define?.deprecated) {
          continue;
        }
        if (!isDev() && define.name.startsWith("demo")) {
          continue;
        }
        list.push({ ...define, key });
      }
    }

    list = list.sort((a, b) => {
      return (a.order ?? 10) - (b?.order ?? 10);
    });
    return list;
  }

  getDefine(key: string, prefix?: string) {
    if (prefix) {
      key = prefix + ":" + key;
    }
    const item = this.storage[key];
    if (!item) {
      return;
    }
    return item.define;
  }
}

export function createRegistry<T>(type: string, onRegister?: OnRegister<T>, onUnRegister?: OnRegister<T>): Registry<T> {
  const pipelineregistrycacheKey = "PIPELINE_REGISTRY_CACHE";
  // @ts-ignore
  let cached: any = global[pipelineregistrycacheKey];
  if (!cached) {
    cached = {};
    // @ts-ignore
    global[pipelineregistrycacheKey] = cached;
  }

  if (cached[type]) {
    return cached[type];
  }
  const newRegistry = new Registry<T>(type, onRegister, onUnRegister);
  cached[type] = newRegistry;
  return newRegistry;
}
