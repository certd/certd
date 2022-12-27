import { Registrable } from "../registry";
import { accessRegistry } from "./registry";
import { FormItemProps } from "../d.ts";
import { AbstractAccess } from "./abstract-access";

export type AccessInputDefine = FormItemProps & {
  title: string;
  required?: boolean;
};
export type AccessDefine = Registrable & {
  inputs?: {
    [key: string]: AccessInputDefine;
  };
};
export interface IAccessService {
  getById(id: any): Promise<AbstractAccess>;
}
