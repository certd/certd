import _ from "lodash-es";
import { HttpClient, ILogger, utils } from "../utils";

export type PluginRequestHandleReq<T = any> = {
  typeName: string;
  action: string;
  input: T;
  data: any;
};

export type AccessRequestHandleReqInput<T = any> = {
  id?: number;
  title?: string;
  access: T;
};
export type AccessRequestHandleReq<T = any> = PluginRequestHandleReq<AccessRequestHandleReqInput<T>>;

export type AccessRequestHandleContext = {
  http: HttpClient;
  logger: ILogger;
  utils: typeof utils;
};

export class AccessRequestHandler<T = any> {
  async onRequest(req: AccessRequestHandleReq<T>, ctx: AccessRequestHandleContext) {
    if (!req.action) {
      throw new Error("action is required");
    }

    let methodName = req.action;
    if (!req.action.startsWith("on")) {
      methodName = `on${_.upperFirst(req.action)}`;
    }

    // @ts-ignore
    const method = this[methodName];
    if (method) {
      // @ts-ignore
      return await this[methodName](req.data, ctx);
    }
    throw new Error(`action ${req.action} not found`);
  }
}
