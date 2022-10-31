import { Registrable } from "../registry";
import { accessRegistry } from "./registry";
import { FormItemProps } from "../d.ts";

export type AccessInput = FormItemProps & {
  title: string;
  required?: boolean;
};
export type AccessDefine = Registrable & {
  input: {
    [key: string]: AccessInput;
  };
};
export function IsAccess(define: AccessDefine) {
  return function (target: any) {
    target.prototype.define = define;
    accessRegistry.install(target);
  };
}
