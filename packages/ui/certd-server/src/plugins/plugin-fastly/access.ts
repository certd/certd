import { AccessInput, BaseAccess, IsAccess } from "@certd/pipeline";

/**
 * Fastly Access Plugin
 * Provides API authentication and HTTP helper for Fastly API endpoints.
 */
@IsAccess({
  name: "fastly",
  title: "Fastly授权",
  icon: "simple-icons:fastly",
  desc: "Fastly CDN / TLS Custom Certificates API 授权",
})
export class FastlyAccess extends BaseAccess {
  @AccessInput({
    title: "API Token",
    component: {
      placeholder: "Fastly API Key / Token",
    },
    helper: "前往 Fastly Account Settings -> Personal Access Tokens 创建 Token",
    required: true,
    encrypt: true,
  })
  apiKey = "";

  @AccessInput({
    title: "HTTP代理",
    component: {
      placeholder: "http://xxxx.xxx.xx:10811",
    },
    helper: "可选：是否使用 HTTP 代理访问 Fastly API",
    required: false,
    encrypt: false,
  })
  proxy = "";

  @AccessInput({
    title: "测试",
    component: {
      name: "api-test",
      action: "TestRequest",
    },
    helper: "测试授权是否正确",
  })
  testRequest = true;

  async onTestRequest() {
    await this.doRequestApi("/tls/certificates?page[size]=1", null, "get");
    return "ok";
  }

  async doRequestApi(url: string, data: any = null, method = "post") {
    const baseUrl = "https://api.fastly.com";
    const requestUrl = url.startsWith("http") ? url : `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;

    const headers: Record<string, string> = {
      "Fastly-Key": this.apiKey,
      Accept: "application/vnd.api+json",
    };

    if (data && (method.toLowerCase() === "post" || method.toLowerCase() === "patch" || method.toLowerCase() === "put")) {
      headers["Content-Type"] = "application/vnd.api+json";
    }

    try {
      const res = await this.ctx.http.request<any, any>({
        url: requestUrl,
        method,
        headers,
        data,
        httpProxy: this.proxy,
      });

      return res;
    } catch (e: any) {
      const errorData = e.response?.data;
      if (errorData) {
        const errorsStr = JSON.stringify(errorData);
        this.ctx.logger.error(`Fastly API Error: ${errorsStr}`);
        throw new Error(`Fastly API 请求失败: ${errorsStr}`);
      }
      throw e;
    }
  }

  async getServices() {
    const res = await this.doRequestApi("/service", null, "get");
    // /service returns a direct array of objects
    return Array.isArray(res) ? res : res?.data || [];
  }

  async getTlsConfigurations() {
    const res = await this.doRequestApi("/tls/configurations", null, "get");
    return res?.data?.data || [];
  }

  async getTlsDomains() {
    const res = await this.doRequestApi("/tls/domains", null, "get");
    return res?.data?.data || [];
  }

  async getCertificates() {
    const res = await this.doRequestApi("/tls/certificates", null, "get");
    return res?.data?.data || [];
  }
}

new FastlyAccess();
