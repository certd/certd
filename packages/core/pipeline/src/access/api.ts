import { Registrable } from "../registry";
import { FormItemProps } from "../d.ts";

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
  getById(id: any): Promise<any>;
}
