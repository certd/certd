import { getGlobalAgents, ILogger } from "@certd/basic";
import { ImportRuntime } from "@certd/pipeline";

export class AliyunClient {
  client: any;
  logger: ILogger;
  agent: any;
  useROAClient: boolean;
  importRuntime: ImportRuntime;

  constructor(opts: { logger: ILogger; useROAClient?: boolean; importRuntime?: ImportRuntime }) {
    this.logger = opts.logger;
    this.useROAClient = opts.useROAClient || false;
    this.importRuntime = opts.importRuntime || (async (specifier: string) => await import(specifier));
    const agents = getGlobalAgents();
    this.agent = agents.httpsAgent;
  }

  async getSdk() {
    if (this.useROAClient) {
      return await this.getROAClient();
    }
    const Core = await this.importRuntime("@alicloud/pop-core");
    return Core.default;
  }

  async getROAClient() {
    const Core = await this.importRuntime("@alicloud/pop-core");
    // @ts-ignore
    return Core.ROAClient;
  }

  async init(opts: any) {
    const Core = await this.getSdk();
    this.client = new Core(opts);
    return this.client;
  }

  checkRet(ret: any) {
    if (ret.Code != null && ret.Code !== "OK" && ret.Message !== "OK") {
      throw new Error("执行失败：" + ret.Message);
    }
  }

  async request(
    name: string,
    params: any,
    requestOption: any = {
      method: "POST",
      formatParams: false,
    }
  ) {
    if (!this.useROAClient) {
      requestOption.agent = this.agent;
    }

    const getNumberFromEnv = (key: string, defValue: number) => {
      const value = process.env[key];
      if (value) {
        try {
          return parseInt(value);
        } catch (e: any) {
          this.logger.error(`环境变量${key}设置错误，应该是一个数字，当前值为${value}，将使用默认值：${defValue}`);
          return defValue;
        }
      } else {
        return defValue;
      }
    };

    // 连接超时设置，仅对当前请求有效。
    requestOption.connectTimeout = getNumberFromEnv("ALIYUN_CLIENT_CONNECT_TIMEOUT", 8000);
    // 读超时设置，仅对当前请求有效。
    requestOption.readTimeout = getNumberFromEnv("ALIYUN_CLIENT_READ_TIMEOUT", 8000);

    const res = await this.client.request(name, params, requestOption);
    this.checkRet(res);
    return res;
  }
}
