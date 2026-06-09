import { VolcengineOpts } from "./ve-client.js";
import { CertInfo } from "@certd/plugin-cert";

export class VolcengineCdnClient {
  opts: VolcengineOpts;

  service: any;

  constructor(opts: VolcengineOpts) {
    this.opts = opts;
  }

  async getCdnClient() {
    if (this.service) {
      return this.service;
    }
    const { cdn } = await import("@volcengine/openapi");
    const service = new cdn.CdnService();
    // 设置ak、sk
    service.setAccessKeyId(this.opts.access.accessKeyId);
    service.setSecretKey(this.opts.access.secretAccessKey);

    this.service = service;
    return service;
  }

  async uploadCert(cert: CertInfo, certName: string) {
    const service = await this.getCdnClient();
    const res = await service.Generic("AddCertificate", {
      Source: "volc_cert_center",
      CertType: "server_cert",
      Certificate: cert.crt,
      PrivateKey: cert.key,
      EncryType: "inter_cert",
      Repeatable: false,
      Desc: certName,
    });

    if (res.ResponseMetadata?.Error) {
      if (res.ResponseMetadata?.Error?.Code?.includes("Duplicated")) {
        // 证书已存在，ID为 cert-16293a8524844a3e8e30ed62f8e5bc94。
        const message = res.ResponseMetadata?.Error?.Message;
        const reg = /ID为 (\S+)。/;
        const certId = message.match(reg)?.[1];
        if (certId) {
          this.opts.logger.info(`证书已存在，ID为 ${certId}`);
          return certId;
        }
      }
      throw new Error(JSON.stringify(res.ResponseMetadata?.Error));
    }

    const certId = res.Result.CertId;
    this.opts.logger.info(`上传证书成功:${certId}`);
    return certId;
  }
}
