import { ILogger } from "@certd/basic";
import { TencentAccess } from "../access.js";

export type TencentCertInfo = {
  key: string;
  crt: string;
};
export class TencentSslClient {
  access: TencentAccess;
  logger: ILogger;
  region?: string;
  constructor(opts: { access: TencentAccess; logger: ILogger; region?: string }) {
    this.access = opts.access;
    this.logger = opts.logger;
    this.region = opts.region;
  }
  async getSslClient(): Promise<any> {
    const sdk = await import("tencentcloud-sdk-nodejs/tencentcloud/services/ssl/v20191205/index.js");
    const SslClient = sdk.v20191205.Client;

    const clientConfig = {
      credential: {
        secretId: this.access.secretId,
        secretKey: this.access.secretKey,
      },
      region: this.region,
      profile: {
        httpProfile: {
          endpoint: this.access.isIntl() ? "ssl.intl.tencentcloudapi.com" : "ssl.tencentcloudapi.com",
        },
      },
    };

    return new SslClient(clientConfig);
  }

  checkRet(ret: any) {
    if (!ret || ret.Error) {
      throw new Error("请求失败：" + ret.Error.Code + "," + ret.Error.Message);
    }
  }

  async uploadToTencent(opts: { certName: string; cert: TencentCertInfo }): Promise<string> {
    const client = await this.getSslClient();
    const params = {
      CertificatePublicKey: opts.cert.crt,
      CertificatePrivateKey: opts.cert.key,
      Alias: opts.certName,
    };
    const ret = await client.UploadCertificate(params);
    this.checkRet(ret);
    this.logger.info(`证书[${opts.certName}]上传成功：tencentCertId=`, ret.CertificateId);
    if (this.access.closeExpiresNotify) {
      await this.switchCertNotify([ret.CertificateId], true);
    }

    return ret.CertificateId;
  }

  async switchCertNotify(certIds: string[], disabled: boolean) {
    const client = await this.getSslClient();
    const params = {
      CertificateIds: certIds,
      SwitchStatus: disabled ? 1 : 0, //1是忽略通知，0是不忽略
    };
    const ret = await client.ModifyCertificatesExpiringNotificationSwitch(params);
    this.checkRet(ret);
    this.logger.info(`关闭证书${certIds}过期通知成功`);
    return ret.RequestId;
  }

  async deployCertificateInstance(params: any) {
    const client = await this.getSslClient();
    const res = await client.DeployCertificateInstance(params);
    this.checkRet(res);
    return res;
  }

  async DescribeHostUploadUpdateRecordDetail(params: any) {
    const client = await this.getSslClient();
    const res = await client.request("DescribeHostUploadUpdateRecordDetail", params);
    this.checkRet(res);
    return res;
  }

  async DescribeHostUpdateRecordDetail(params: any) {
    const client = await this.getSslClient();
    const res = await client.request("DescribeHostUpdateRecordDetail", params);
    this.checkRet(res);
    return res;
  }

  async UploadUpdateCertificateInstance(params: any) {
    const client = await this.getSslClient();
    const res = await client.request("UploadUpdateCertificateInstance", params);
    this.checkRet(res);
    return res;
  }

  async UpdateCertificateInstance(params: any) {
    const client = await this.getSslClient();
    const res = await client.request("UpdateCertificateInstance", params);
    this.checkRet(res);
    return res;
  }

  async DescribeCertificates(params: { Limit?: number; Offset?: number; SearchKey?: string }) {
    const client = await this.getSslClient();
    const res = await client.DescribeCertificates({
      ExpirationSort: "ASC",
      ...params,
    });
    this.checkRet(res);
    return res;
  }

  async doRequest(action: string, params: any) {
    const client = await this.getSslClient();
    if (!client[action]) {
      throw new Error(`action ${action} not found`);
    }
    const res = await client[action](params);
    this.checkRet(res);
    return res;
  }
}
