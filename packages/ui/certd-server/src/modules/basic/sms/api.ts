import { FormItemProps, IAccessService } from "@certd/pipeline";

export interface ISmsService {
  sendSmsCode(opts: { mobile: string; code: string; phoneCode: string }): Promise<void>;
  setCtx(ctx: { accessService: IAccessService; config: { [key: string]: any } }): void;
}

export type PluginInputs<T = any> = {
  [key in keyof T]: FormItemProps;
};

export type SmsPluginCtx<T = any> = {
  accessService: IAccessService;
  config: T;
};
