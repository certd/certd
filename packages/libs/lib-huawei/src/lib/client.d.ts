import { HuaweiAccess } from "../access/index.js";
export type ApiRequestOptions = {
  method: string;
  url: string;
  headers?: any;
  data?: any;
};
export declare class HuaweiYunClient {
  access: HuaweiAccess;
  constructor(access: HuaweiAccess);
  request(options: ApiRequestOptions): Promise<any>;
}
