import { AccessInput, BaseAccess, IsAccess } from "@certd/pipeline";
import { ILogger } from "@certd/basic";
export type AliyunClientV2Req = {
  action: string;
  version: string;
  protocol?: "HTTPS";
  // 接口 HTTP 方法
  method?: "GET" | "POST";
  authType?: "AK";
  style?: "RPC" | "ROA";
  // 接口 PATH
  pathname?: string;

  data?: any;
};
export class AliyunClientV2 {
  access: AliyunAccess;
  logger: ILogger;
  endpoint: string;

  client: any;
  constructor(opts: { access: AliyunAccess; logger: ILogger; endpoint: string }) {
    this.access = opts.access;
    this.logger = opts.logger;
    this.endpoint = opts.endpoint;
  }

  async getClient() {
    if (this.client) {
      return this.client;
    }
    const $OpenApi = await import("@alicloud/openapi-client");
    // const Credential = await import("@alicloud/credentials");
    // //@ts-ignore
    // const credential = new Credential.default.default({
    //
    //   type: "access_key",
    // });
    const config = new $OpenApi.Config({
      accessKeyId: this.access.accessKeyId,
      accessKeySecret: this.access.accessKeySecret,
    });
    // Endpoint 请参考 https://api.aliyun.com/product/FC
    // config.endpoint = `esa.${this.regionId}.aliyuncs.com`;
    config.endpoint = this.endpoint;
    //@ts-ignore
    this.client = new $OpenApi.default.default(config);
    return this.client;
  }

  async doRequest(req: AliyunClientV2Req) {
    const client = await this.getClient();

    const $OpenApi = await import("@alicloud/openapi-client");
    const $Util = await import("@alicloud/tea-util");
    const OpenApiUtil = await import("@alicloud/openapi-util");
    const params = new $OpenApi.Params({
      // 接口名称
      action: req.action,
      // 接口版本
      version: req.version,
      // 接口协议
      protocol: "HTTPS",
      // 接口 HTTP 方法
      method: req.method ?? "POST",
      authType: req.authType ?? "AK",
      style: req.style ?? "RPC",
      // 接口 PATH
      pathname: req.pathname ?? `/`,
      // 接口请求体内容格式
      reqBodyType: "json",
      // 接口响应体内容格式
      bodyType: "json",
    });

    if (req.data?.query) {
      //@ts-ignore
      req.data.query = OpenApiUtil.default.default.query(req.data.query);
    }
    const runtime = new $Util.RuntimeOptions({});
    const request = new $OpenApi.OpenApiRequest(req.data);
    // 复制代码运行请自行打印 API 的返回值
    // 返回值实际为 Map 类型，可从 Map 中获得三类数据：响应体 body、响应头 headers、HTTP 返回的状态码 statusCode。
    const res = await client.callApi(params, request, runtime);
    /**
     * res?.body?.
     */
    return res?.body;
  }
}

@IsAccess({
  name: "aliyun",
  title: "阿里云授权",
  desc: "",
  icon: "ant-design:aliyun-outlined",
  order: 0,
})
export class AliyunAccess extends BaseAccess {
  @AccessInput({
    title: "accessKeyId",
    component: {
      placeholder: "accessKeyId",
    },
    helper: "登录阿里云控制台->AccessKey管理页面获取。",
    required: true,
  })
  accessKeyId = "";
  @AccessInput({
    title: "accessKeySecret",
    component: {
      placeholder: "accessKeySecret",
    },
    required: true,
    encrypt: true,
    helper: "注意：证书申请需要dns解析权限；其他阿里云插件，需要对应的权限，比如证书上传需要证书管理权限；嫌麻烦就用主账号的全量权限的accessKey",
  })
  accessKeySecret = "";

  getClient(endpoint: string) {
    return new AliyunClientV2({
      access: this,
      logger: this.ctx.logger,
      endpoint: endpoint,
    });
  }
}

new AliyunAccess();
