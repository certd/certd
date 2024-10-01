import { HttpClient, ILogger, utils } from "../utils/index.js";

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
export type AccessRequestHandleContext = {
  http: HttpClient;
  logger: ILogger;
  utils: typeof utils;
};

export type AccessRequestHandleReq<T = any> = PluginRequestHandleReq<AccessRequestHandleReqInput<T>>;
