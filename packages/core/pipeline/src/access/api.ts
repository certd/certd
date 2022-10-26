import { Registrable } from "../registry";
import { FormItemProps } from "@fast-crud/fast-crud";

export type AccessDefine = Registrable & {
  input: {
    [key: string]: FormItemProps;
  };
};
export function IsAccess(define: AccessDefine) {
  return function (target: any) {
    target.prototype.define = define;
  };
}
