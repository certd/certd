import { Registrable } from "../registry/index.js";
import { FormItemProps } from "../dt/index.js";

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

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IAccess {}
