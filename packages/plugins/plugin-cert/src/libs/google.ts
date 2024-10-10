import { EabAccess, GoogleAccess } from "../access/index.js";
import { ILogger } from "@certd/basic";

export class GoogleClient {
  access: GoogleAccess;
  logger: ILogger;
  constructor(opts: { logger: ILogger; access: GoogleAccess }) {
    this.access = opts.access;
    this.logger = opts.logger;
  }
  async getEab() {
    // https://cloud.google.com/docs/authentication/api-keys-use#using-with-client-libs
    const { v1 } = await import("@google-cloud/publicca");
    // process.env.HTTPS_PROXY = "http://127.0.0.1:10811";
    const access = this.access;
    if (!access.serviceAccountSecret) {
      throw new Error("服务账号密钥 不能为空");
    }
    const credentials = JSON.parse(access.serviceAccountSecret);

    const client = new v1.PublicCertificateAuthorityServiceClient({ credentials });
    const parent = `projects/${access.projectId}/locations/global`;
    const externalAccountKey = {};
    const request = {
      parent,
      externalAccountKey,
    };

    let envHttpsProxy = "";
    try {
      if (this.access.httpsProxy) {
        //设置临时使用代理
        envHttpsProxy = process.env.HTTPS_PROXY;
        process.env.HTTPS_PROXY = this.access.httpsProxy;
      }
      this.logger.info("开始获取google eab授权");
      const response = await client.createExternalAccountKey(request);
      const { keyId, b64MacKey } = response[0];
      const eabAccess = new EabAccess();
      eabAccess.kid = keyId;
      eabAccess.hmacKey = b64MacKey.toString();
      this.logger.info(`google eab授权获取成功，kid: ${eabAccess.kid}`);
      return eabAccess;
    } finally {
      if (envHttpsProxy) {
        process.env.HTTPS_PROXY = envHttpsProxy;
      }
    }
  }
}

// const access = new GoogleAccess();
// access.projectId = "hip-light-432411-d4";
// access.serviceAccountSecret = `
//
//
// `;
// // process.env.HTTPS_PROXY = "http://127.0.0.1:10811";
// const client = new GoogleClient(access);
// client.getEab().catch((e) => {
//   console.error(e);
// });
