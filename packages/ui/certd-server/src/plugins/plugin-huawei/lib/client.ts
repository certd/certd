import { Signer, SigHttpRequest } from './signer';
import { HuaweiAccess } from '../access';
import axios from 'axios';
import { logger } from '@certd/pipeline';

export type ApiRequestOptions = {
  method: string;
  url: string;
  headers?: any;
  data?: any;
};
export class HuaweiYunClient {
  access: HuaweiAccess;
  constructor(access: HuaweiAccess) {
    this.access = access;
  }
  async request(options: ApiRequestOptions) {
    const sig = new Signer(
      this.access.accessKeyId,
      this.access.accessKeySecret
    );

    //The following example shows how to set the request URL and parameters to query a VPC list.
    //Specify a request method, such as GET, PUT, POST, DELETE, HEAD, and PATCH.
    //Set request host.
    //Set request URI.
    //Set parameters for the request URL.
    let body = undefined;
    if (options.data) {
      body = JSON.stringify(options.data);
    }
    const r = new SigHttpRequest(
      options.method,
      options.url,
      options.headers,
      body
    );
    //Add header parameters, for example, x-domain-id for invoking a global service and x-project-id for invoking a project-level service.
    r.headers = { 'Content-Type': 'application/json' };
    //Add a body if you have specified the PUT or POST method. Special characters, such as the double quotation mark ("), contained in the body must be escaped.
    // r.body = option;
    const opt = sig.Sign(r);
    try {
      const res = await axios.request({
        url: options.url,
        method: options.method,
        headers: opt.headers,
        data: body,
      });
      return res.data;
    } catch (e: any) {
      logger.error('华为云接口请求出错：', e?.response?.data);
      const error: any = new Error(e?.response?.data.message);
      error.code = e?.response?.code;
      throw error;
    }
  }
}
