import { Registrable } from "../registry";
import { FormItemProps } from "../d.ts";

export type AccessInputDefine = FormItemProps & {
  title: string;
  required?: boolean;
};
export type AccessDefine = Registrable & {
  input?: {
    [key: string]: AccessInputDefine;
  };
};
export interface IAccessService {
  getById(id: any): Promise<any>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IAccess {}
