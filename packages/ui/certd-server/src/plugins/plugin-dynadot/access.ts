import { AccessInput, BaseAccess, IsAccess, PageRes, PageSearch, Pager } from "@certd/pipeline";
import { DomainRecord } from "@certd/plugin-lib";
import { createHmac } from "crypto";

export type RequestOptions = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  params?: Record<string, any>;
  data?: any;
};

@IsAccess({
  name: "dynadot",
  title: "Dynadot授权",
  desc: "",
  icon: "simple-icons:dynatrace",
})
export class DynadotAccess extends BaseAccess {
  @AccessInput({
    title: "API Key",
    component: {
      placeholder: "api key",
    },
    helper: "前往 [Dynadot API设置](https://www.dynadot.cn/zh/account/domain/setting/api.html) 获取API Key",
    required: true,
    encrypt: true,
  })
  apiKey = "";

  @AccessInput({
    title: "API Secret",
    component: {
      name: "a-input-password",
      vModel: "value",
      placeholder: "api secret",
    },
    helper: "前往 [Dynadot API设置](https://www.dynadot.cn/zh/account/domain/setting/api.html) 获取API Secret",
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
    helper: "点击测试接口是否正常",
  })
  testRequest = true;

  async onTestRequest() {
    await this.getDomainListPage({
      pageNo: 1,
      pageSize: 1,
    });
    return "ok";
  }

  async getDomainListPage(req: PageSearch): Promise<PageRes<DomainRecord>> {
    const pager = new Pager(req);
    const params: Record<string, any> = {
      page: pager.pageNo,
      page_size: pager.pageSize,
    };
    if (req.searchKey) {
      params.search = req.searchKey;
    }

    const res = await this.doRequest({
      method: "GET",
      path: "/restful/v2/domains",
      params,
    });

    const domainList = res.data?.domain_info_list || [];
    const list = domainList.map((item: any) => ({
      id: item.domain_name,
      domain: item.domain_name,
    }));

    return {
      total: list.length,
      list,
    };
  }

  async doRequest(opts: RequestOptions): Promise<any> {
    const { method, path, params, data } = opts;

    const queryString = params ? "?" + new URLSearchParams(params).toString() : "";
    const fullPath = path + queryString;
    const body = data ? JSON.stringify(data) : "";

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${this.apiKey}`,
      "X-Signature": this.generateSignature(fullPath, body),
    };

    try {
      const res = await this.ctx.http.request<any, any>({
        url: fullPath,
        baseURL: "https://api.dynadot.com",
        method,
        data: body || undefined,
        headers,
      });

      this.checkApiError(res);
      return res;
    } catch (e: any) {
      if (e.response?.data) {
        const errData = e.response.data;
        this.ctx.logger.error("Dynadot API返回错误:", JSON.stringify(errData));
        throw new Error(`Dynadot API错误: ${errData.message || JSON.stringify(errData)}`);
      }
      throw e;
    }
  }

  private generateSignature(fullPathAndQuery: string, body: string): string {
    const stringToSign = this.apiKey + "\n" + fullPathAndQuery + "\n\n" + body;
    const hmac = createHmac("sha256", this.apiSecret);
    hmac.update(stringToSign, "utf8");
    return hmac.digest("base64");
  }

  private checkApiError(res: any) {
    if (!res || typeof res !== "object") {
      return;
    }
    const code = res.code;
    if (code !== undefined && code !== null && code !== 200) {
      const errorMsg = res.message || JSON.stringify(res);
      throw new Error(`Dynadot API错误: ${errorMsg}`);
    }
  }
}

new DynadotAccess();
