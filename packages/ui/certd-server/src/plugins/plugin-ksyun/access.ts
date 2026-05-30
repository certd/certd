import { AccessInput, BaseAccess, IsAccess } from "@certd/pipeline";
import { KsyunClient } from "./client.js";
import { CertInfo } from "@certd/plugin-cert";

/**
 */
@IsAccess({
  name: "ksyun",
  title: "金山云授权",
  desc: "",
  icon: "svg:icon-ksyun",
})
export class KsyunAccess extends BaseAccess {
  @AccessInput({
    title: "AccessKeyID",
    component: {
      placeholder: "AccessKeyID",
    },
    helper: "[获取密钥](https://uc.console.ksyun.com/pro/iam/#/set/keyManage)",
    required: true,
  })
  accessKeyId = "";
  @AccessInput({
    title: "AccessKeySecret",
    component: {
      placeholder: "AccessKeySecret",
    },
    required: true,
    encrypt: true,
  })
  accessKeySecret = "";

  @AccessInput({
    title: "测试",
    component: {
      name: "api-test",
      action: "TestRequest",
    },
    helper: "点击测试接口是否正常",
  })
  testRequest = true;

  async onTestRequest() {
    const client = await this.getCdnClient();
    await this.getCertList({ client });
    return "ok";
  }

  async getCertList(opts?: { client: KsyunClient; pageNo?: number; pageSize?: number }) {
    const res = await opts.client.doRequest({
      action: "GetCertificates",
      version: "2016-09-01",
      method: "POST",
      url: "/2016-09-01/cert/GetCertificates",
      data: {
        PageNum: opts?.pageNo || 1,
        PageSize: opts?.pageSize || 30,
      },
    });
    this.ctx.logger.info(res);
    return res;
  }

  /**
   * CertificateId	是	string	证书对应的唯一ID
   * CertificateName	是	String	安全证书名称
   * ServerCertificate	是	String	域名对应的安全证书内容
   * PrivateKey
   * @param opts
   */
  async updateCert(opts: { client: KsyunClient; certId: string; certName: string; cert: CertInfo }) {
    const res = await opts.client.doRequest({
      action: "SetCertificate",
      version: "2016-09-01",
      method: "POST",
      url: "/2016-09-01/cert/SetCertificate",
      data: {
        CertificateId: opts.certId,
        CertificateName: opts.certName,
        ServerCertificate: opts.cert.crt,
        PrivateKey: opts.cert.key,
      },
    });
    this.ctx.logger.info(res);
    return res;
  }

  async getCert(opts: { client: KsyunClient; certId: string }) {
    const res = await opts.client.doRequest({
      action: "GetCertificates",
      version: "2016-09-01",
      method: "POST",
      url: "/2016-09-01/cert/GetCertificates",
      data: {
        CertificateId: opts.certId,
      },
    });
    this.ctx.logger.info(res);
    const list = res.Certificates;
    if (list.length > 0) {
      return list[0];
    }
    throw new Error(`未找到证书:${opts.certId}`);
  }

  async getCdnClient() {
    return new KsyunClient({
      accessKeyId: this.accessKeyId,
      secretAccessKey: this.accessKeySecret,
      region: "cn-beijing-6",
      service: "cdn",
      endpoint: "cdn.api.ksyun.com",
      logger: this.ctx.logger,
      http: this.ctx.http,
    });
  }
}

new KsyunAccess();
