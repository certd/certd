import { Logger } from "log4js";
import { logger } from "../utils/util.log";

export type Registrable = {
  name: string;
  title: string;
  desc?: string;
};

export abstract class AbstractRegistrable<T extends Registrable> {
  logger: Logger = logger;
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

  install(target: T) {
    if (target == null) {
      return;
    }
    // @ts-ignore
    const define = new target().define;
    let defineName = define.name;
    if (defineName == null) {
      defineName = target.name;
    }

    this.register(defineName, target);
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
}
