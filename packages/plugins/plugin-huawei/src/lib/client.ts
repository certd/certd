// @ts-ignore
import signer from "./signer";
import https from "https";
import { HuaweiAccess } from "../access";
import { axios } from "@certd/acme-client";

export type ApiRequestOptions = {
  method: string;
  url: string;
  headers: any;
  body: any;
};
export class HuaweiYunClient {
  access: HuaweiAccess;
  constructor(access: HuaweiAccess) {
    this.access = access;
  }
  async request(options: ApiRequestOptions) {
    const sig = new signer.Signer();
    //Set the AK/SK to sign and authenticate the request.
    sig.Key = this.access.accessKeyId;
    sig.Secret = this.access.accessKeySecret;

    //The following example shows how to set the request URL and parameters to query a VPC list.
    //Specify a request method, such as GET, PUT, POST, DELETE, HEAD, and PATCH.
    //Set request host.
    //Set request URI.
    //Set parameters for the request URL.
    const r = new signer.HttpRequest(options.method, options.url, options.headers, options.body);
    //Add header parameters, for example, x-domain-id for invoking a global service and x-project-id for invoking a project-level service.
    r.headers = { "Content-Type": "application/json" };
    //Add a body if you have specified the PUT or POST method. Special characters, such as the double quotation mark ("), contained in the body must be escaped.
    r.body = "";

    const opt = sig.Sign(r);
    console.log("opt", opt);
    console.log(opt.headers["X-Sdk-Date"]);
    console.log(opt.headers["Authorization"]);
    const res = await axios.request(opt);
    return res;
  }
}
