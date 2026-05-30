import { AccessInput, BaseAccess, IsAccess } from "@certd/pipeline";
import { HttpRequestConfig } from "@certd/basic";
import { CertInfo } from "@certd/plugin-cert";

/**
 */
@IsAccess({
  name: "dokploy",
  title: "Dokploy授权",
  desc: "",
  icon: "svg:icon-lucky",
})
export class DokployAccess extends BaseAccess {
  @AccessInput({
    title: "Dokploy地址",
    component: {
      placeholder: "http://192.168.11.11:5480",
    },
    required: true,
  })
  endpoint = "";

  @AccessInput({
    title: "ApiKey",
    component: {
      placeholder: "ApiKey",
    },
    // naAyXbZmxtsfrDfneOCeirbQNIICmBgfBiYXQwryPIUOdzPkXkfnaKjeAdbOQdwp
    //tlyvdNzojaFkNfGScALLmyuFHkHcYWaxoYjiDzWFHcnZAWdjOquMSqBwHLvGDGZK
    helper: "[settings-profile](https://app.dokploy.com/dashboard/settings/profile)中配置API Keys",
    required: true,
    encrypt: true,
  })
  apiKey = "";

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
    await this.getCertList();
    return "ok";
  }

  async getServerList() {
    const req = {
      url: "/api/server.all",
      method: "get",
    };
    return await this.doRequest(req);
  }

  async getCertList() {
    const req = {
      url: "/api/certificates.all",
      method: "get",
    };
    return await this.doRequest(req);
  }

  async createCert(opts: { cert: CertInfo; serverId: string; name: string }) {
    const req = {
      url: "/api/certificates.create",
      method: "post",
      data: {
        // certificateId:opts.certificateId,
        name: opts.name,
        certificateData: opts.cert.crt,
        privateKey: opts.cert.key,
        serverId: opts.serverId,
        autoRenew: false,
        organizationId: "",
      },
    };
    return await this.doRequest(req);
  }

  async removeCert(opts: { id: string }) {
    const req = {
      url: "/api/certificates.remove",
      method: "post",
      data: {
        certificateId: opts.id,
      },
    };
    return await this.doRequest(req);
  }

  async doRequest(req: HttpRequestConfig) {
    const headers = {
      "x-api-key": this.apiKey,
      ...req.headers,
    };
    return await this.ctx.http.request({
      headers,
      baseURL: this.endpoint,
      ...req,
      logRes: false,
    });
  }
}

new DokployAccess();
