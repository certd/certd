import { IsAccess, AccessInput, BaseAccess, PageSearch } from "@certd/pipeline";

@IsAccess({
  name: "spaceship",
  title: "Spaceship.com 授权",
  icon: "clarity:plugin-line",
  desc: "Spaceship.com API 授权插件",
})
export class SpaceshipAccess extends BaseAccess {
  @AccessInput({
    title: "API Key",
    component: {
      placeholder: "请输入 API Key",
    },
    required: true,
    encrypt: true,
    helper: "前往 [获取 API Key](https://www.spaceship.com/application/api-manager/)",
  })
  apiKey = "";

  @AccessInput({
    title: "API Secret",
    component: {
      name: "a-input-password",
      vModel: "value",
      placeholder: "请输入 API Secret",
    },
    required: true,
    encrypt: true,
  })
  apiSecret = "";

  @AccessInput({
    title: "测试",
    component: {
      name: "api-test",
      action: "TestRequest",
    },
    helper: "测试 API 连接是否正常，需要域名查询权限",
  })
  testRequest = true;

  async onTestRequest() {
    await this.GetDomainList({});
    return "ok";
  }

  async doRequest(options: { url: string; method: "GET" | "POST" | "DELETE" | "PUT"; params?: any; data?: any }) {
    const headers = {
      "X-Api-Key": this.apiKey,
      "X-Api-Secret": this.apiSecret,
    };

    try {
      const res = await this.ctx.http.request({
        url: options.url,
        method: options.method,
        headers,
        params: options.params,
        data: options.data,
      });
      return res;
    } catch (error: any) {
      const errorMsg = [];
      const status = error.status || error.response?.status;
      if (error.response) {
        const headers = error.response.headers;
        const data = error.response.data;

        errorMsg.push(`API 请求失败: ${status}`);

        if (headers["spaceship-error-code"]) {
          errorMsg.push(`错误代码: ${headers["spaceship-error-code"]}`);
        }

        if (headers["spaceship-operation-id"]) {
          errorMsg.push(`操作ID: ${headers["spaceship-operation-id"]}`);
        }

        if (data && data.detail) {
          errorMsg.push(`错误详情: ${data.detail}`);
        }

        this.ctx.logger.error(`Spaceship API 错误: ${errorMsg.join(" | ")}`);
      } else if (error.request) {
        errorMsg.push(`请求发送失败: ${error.message}`);
        this.ctx.logger.error(`Spaceship API 请求发送失败: ${error.message}`);
      } else {
        errorMsg.push(`请求配置错误: ${error.message}`);
        this.ctx.logger.error(`Spaceship API 请求配置错误: ${error.message}`);
      }

      const error2 = new Error(errorMsg.join(" | "));
      //@ts-ignore
      error2.status = status;
      throw error2;
    }
  }

  async GetDomainList(req: PageSearch) {
    const take = req.pageSize || 100;
    const skip = ((req.pageNo || 1) - 1) * take;

    const res = await this.doRequest({
      url: "https://spaceship.dev/api/v1/domains",
      method: "GET",
      params: {
        take,
        skip,
      },
    });

    return {
      total: res.total || 0,
      list: res.items || [],
    };
  }

  async getDomainInfo(domain: string) {
    try {
      const res = await this.doRequest({
        url: `https://spaceship.dev/api/v1/domains/${domain}`,
        method: "GET",
      });
      return res;
    } catch (error: any) {
      if (error.status === 404) {
        throw new Error(`域名 ${domain} 不存在于当前账号中`);
      }
      throw error;
    }
  }

  getCacheKey() {
    const hashStr = this.apiKey + this.apiSecret;
    const hashCode = this.ctx.utils.hash.sha256(hashStr);
    return `spaceship-${hashCode}`;
  }
}

new SpaceshipAccess();
