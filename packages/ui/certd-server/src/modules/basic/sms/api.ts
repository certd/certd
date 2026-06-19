import { FormItemProps, IAccessService } from "@certd/pipeline";
import type { RuntimeDepsService } from "../../runtime-deps/runtime-deps-service.js";

export interface ISmsService {
  sendSmsCode(opts: { mobile: string; code: string; phoneCode: string }): Promise<void>;
  setCtx(ctx: { accessService: IAccessService; config: { [key: string]: any }; runtimeDepsService?: RuntimeDepsService }): Promise<void>;
}

export type PluginInputs<T = any> = {
  [key in keyof T]: FormItemProps;
};

export type SmsPluginCtx<T = any> = {
  accessService: IAccessService;
  config: T;
  runtimeDepsService?: RuntimeDepsService;
};
