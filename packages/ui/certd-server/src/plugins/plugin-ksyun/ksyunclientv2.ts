import { importRuntime } from "@certd/pipeline";
import { ILogger } from "@certd/basic";
import { get } from "lodash-es";

export class KsyunClientV2 {
  private sdkClient: any;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly region: string;
  private readonly endpoint: string;
  private readonly logger: ILogger;
  private readonly clientClass: any;
  private readonly contentType: string;
  private readonly method: string;
  private readonly actionMethods: Record<string, string>;

  constructor(opts: {
    accessKeyId: string;
    secretAccessKey: string;
    region?: string;
    endpoint: string;
    logger: ILogger;
    clientClass?: string;
    contentType?: string;
    method?: string;
    actionMethods?: Record<string, string>;
  }) {
    this.accessKeyId = opts.accessKeyId;
    this.secretAccessKey = opts.secretAccessKey;
    this.region = opts.region || "cn-beijing-6";
    this.endpoint = opts.endpoint;
    this.logger = opts.logger;
    this.clientClass = opts.clientClass || "Cdn.v20160901";
    this.contentType = opts.contentType || "application/x-www-form-urlencoded";
    this.method = opts.method || "";
    this.actionMethods = opts.actionMethods || {};
  }

  private async getSdkClient() {
    if (!this.sdkClient) {
      const sdk = await importRuntime("ksyun-sdk-node", this.logger);
      const ClientClass = get(sdk.default, this.clientClass);
      if (!ClientClass) {
        throw new Error("未找到金山云 SDK 客户端类");
      }
      const httpProfile: any = {
        timeout: 60,
        protocol: "",
        endpoint: this.endpoint,
        headers: {
          "Content-Type": this.contentType,
        },
      };
      if (this.method) {
        httpProfile.method = this.method;
      }
      this.sdkClient = new ClientClass({
        credential: {
          secretId: this.accessKeyId,
          secretKey: this.secretAccessKey,
        },
        region: this.region,
        httpProfile,
      });
      for (const [action, method] of Object.entries(this.actionMethods)) {
        if (this.sdkClient._apiList?.[action]) {
          this.sdkClient._apiList[action].method = method;
        }
      }
    }
    return this.sdkClient;
  }

  async doRequest(opts: { action: string; data?: Record<string, any>; query?: Record<string, any> }) {
    const client = await this.getSdkClient();
    if (opts.query) {
      const apiConfig = client._apiList?.[opts.action];
      if (apiConfig) {
        apiConfig.config.query = { ...apiConfig.config.query, ...opts.query };
      }
    }
    const response = await client.request(opts.action, opts.data || {});
    const result = await response.json();
    this.logger.info(JSON.stringify(result));
    if (result?.Error) {
      throw new Error(result.Error.Message || `金山云请求失败: ${opts.action}`);
    }
    return result;
  }
}
