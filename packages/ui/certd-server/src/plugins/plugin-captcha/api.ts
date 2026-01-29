export type CaptchaRequest = {
  remoteIp: string,
}
export interface  ICaptchaAddon{
  onValidate(data?:any,req?:CaptchaRequest):Promise<any>;
  getCaptcha():Promise<any>;
}
