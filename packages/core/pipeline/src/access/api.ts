import { Registrable } from "../registry/index.js";
import { FormItemProps } from "../dt/index.js";
import { HttpClient, ILogger, utils } from "../utils";

export type AccessInputDefine = FormItemProps & {
  title: string;
  required?: boolean;
  encrypt?: boolean;
};
export type AccessDefine = Registrable & {
  input?: {
    [key: string]: AccessInputDefine;
  };
};
export interface IAccessService {
  getById<T = any>(id: any): Promise<T>;
}

export interface IAccess {
  ctx: AccessContext;
  [key: string]: any;
}

export type AccessContext = {
  http: HttpClient;
  logger: ILogger;
  utils: typeof utils;
};
