//@ts-ignore
import { HcClient } from "@huaweicloud/huaweicloud-sdk-core/HcClient";

export class HuaweiCcmClient {
  //@ts-ignore
  hcClient: HcClient;

  //@ts-ignore
  constructor(client: HcClient) {
    this.hcClient = client;
  }

  /**
   */
  importCertificate(req: { name: string; certificate: string; private_key: string; duplicate_check: boolean }) {
    const options: any = {
      method: "POST",
      url: "/v3/scm/certificates/import",
      pathParams: {},
      queryParams: {},
      contentType: "application/json",
      headers: {
        "Content-Type": "application/json",
      },
      /**
       * name
       * string	是
       * 证书名称。字符长度为3~63位, 请输入英文字符,数字,下划线,中划线,英文句点。
       *
       * certificate
       * string	是
       * 证书内容,可包含中间证书及根证书。若certificate_chain字段传入证书链,则该字段只取证书本身。回车换行需要使用转义字符\n或者\r\n替换。
       *
       * certificate_chain
       * string	否
       * 证书链,非必填,可通过certificate字段传入。回车换行需要使用转义字符\n或者\r\n替换。
       *
       * private_key
       * string	是
       * 证书私钥。
       * 不能上传带有口令保护的私钥,回车换行需要使用转义字符\n或者\r\n替换。
       *
       * duplicate_check
       */
      data: {
        ...req,
      },
    };
    // @ts-ignore
    options["responseHeaders"] = ["X-Request-Id"];
    return this.hcClient.sendRequest(options);
  }
}
