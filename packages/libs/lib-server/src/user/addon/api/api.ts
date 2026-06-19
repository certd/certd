import { HttpClient, ILogger, utils } from "@certd/basic";
import {upperFirst} from "lodash-es";
import {
  accessRegistry,
  FormItemProps,
  IAccessService,
  IRuntimeDepsService,
  IServiceGetter,
  PluginRequestHandleReq,
  Registrable
} from "@certd/pipeline";


export type AddonRequestHandleReqInput<T = any> = {
  id?: number;
  title?: string;
  addon: T;
};

export type AddonRequestHandleReq<T = any> = {
  addonType: string;
} &PluginRequestHandleReq<AddonRequestHandleReqInput<T>>;

export type AddonInputDefine = FormItemProps & {
  title: string;
  required?: boolean;
};
export type AddonDefine = Registrable & {
  addonType: string;
  needPlus?: boolean;
  dependPlugins?: Record<string, string>;
  dependPackages?: Record<string, string>;
  input?: {
    [key: string]: AddonInputDefine;
  };
  showTest?: boolean;
  icon?: string;
};

export type AddonInstanceConfig = {
  id: number;
  addonType: string;
  type: string;
  name: string;
  userId: number;
  setting: {
    [key: string]: any;
  };
};



export interface IAddon {
  ctx: AddonContext;
  [key: string]: any;
}

export type AddonContext = {
  http: HttpClient;
  logger: ILogger;
  utils: typeof utils;
  serviceGetter: IServiceGetter;
};

export abstract class BaseAddon implements IAddon {
  define!: AddonDefine;
  ctx!: AddonContext;
  http!: HttpClient;
  logger!: ILogger;
  runtimeDepsService?: IRuntimeDepsService;

  async importRuntime(specifier: string) {
    if (!this.runtimeDepsService) {
      return await import(specifier);
    }
    return await this.runtimeDepsService.importRuntime(specifier, this.logger);
  }

  title!: string;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async onInstance() {}

  async getAccess<T = any>(accessId: string | number, isCommon = false) {
    if (accessId == null) {
      throw new Error("您还没有配置授权");
    }
    const accessService = await this.ctx.serviceGetter.get<IAccessService>("accessService")
    let res: any = null;
    if (isCommon) {
      res = await accessService.getCommonById(accessId);
    } else {
      res = await accessService.getById(accessId);
    }
    if (res == null) {
      throw new Error("授权不存在，可能已被删除，请前往任务配置里面重新选择授权");
    }
    // @ts-ignore
    if (this.logger?.addSecret) {
      // 隐藏加密信息，不在日志中输出
      const type = res._type;
      const plugin = accessRegistry.get(type);
      const define = plugin.define;
      // @ts-ignore
      const input = define.input;
      for (const key in input) {
        if (input[key].encrypt && res[key] != null) {
          // @ts-ignore
          this.logger.addSecret(res[key]);
        }
      }
    }

    return res as T;
  }

  async setCtx(ctx: AddonContext) {
    this.ctx = ctx;
    this.http = ctx.http;
    this.logger = ctx.logger;
    if (!this.runtimeDepsService && this.ctx.serviceGetter) {
      this.runtimeDepsService = await this.ctx.serviceGetter.get("runtimeDepsService");
    }
    if (this.runtimeDepsService && this.define?.addonType && this.define?.name) {
      await this.runtimeDepsService.ensureRuntimeDependencies({ pluginKeys: `addon:${this.define.addonType}:${this.define.name}`, logger: this.logger });
    }
  }
  setDefine = (define:AddonDefine) => {
    this.define = define;
  };

  async onRequest(req:AddonRequestHandleReq) {
    if (!req.action) {
      throw new Error("action is required");
    }

    let methodName = req.action;
    if (!req.action.startsWith("on")) {
      methodName = `on${upperFirst(req.action)}`;
    }

    // @ts-ignore
    const method = this[methodName];
    if (method) {
      // @ts-ignore
      return await this[methodName](req.data);
    }
    throw new Error(`action ${req.action} not found`);
  }

}


export interface IAddonGetter {
  getById<T = any>(id: any): Promise<T>;
  getCommonById<T = any>(id: any): Promise<T>;
}
