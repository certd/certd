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

  /**
   * Fetches every page of a Fastly JSON:API list endpoint.
   * ctx.http already unwraps the response to its body, so the item array is at `body.data`.
   * Fastly paginates these endpoints at 20 items/page by default; without looping only the
   * first page would be visible in the selectors.
   */
  async listAllJsonApi(path: string, pageSize = 100): Promise<any[]> {
    const all: any[] = [];
    const maxPages = 100; // hard cap to avoid an infinite loop if the API misbehaves
    for (let page = 1; page <= maxPages; page++) {
      const sep = path.includes("?") ? "&" : "?";
      const body = await this.doRequestApi(`${path}${sep}page[number]=${page}&page[size]=${pageSize}`, null, "get");
      const items = body?.data;
      if (!Array.isArray(items) || items.length === 0) {
        break;
      }
      all.push(...items);
      const totalPages = body?.meta?.total_pages;
      if (totalPages != null ? page >= totalPages : items.length < pageSize) {
        break;
      }
    }
    return all;
  }

  async getServices() {
    // legacy /service endpoint returns a bare array of objects (not JSON:API)
    const res = await this.doRequestApi("/service?per_page=200", null, "get");
    return Array.isArray(res) ? res : res?.data || [];
  }

  async getTlsConfigurations() {
    return this.listAllJsonApi("/tls/configurations");
  }

  async getTlsDomains() {
    return this.listAllJsonApi("/tls/domains");
  }

  async getCertificates() {
    return this.listAllJsonApi("/tls/certificates");
  }
}

new FastlyAccess();
