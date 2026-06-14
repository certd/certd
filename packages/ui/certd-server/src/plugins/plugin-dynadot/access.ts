import { AccessInput, BaseAccess, IsAccess, PageRes, PageSearch } from "@certd/pipeline";
import { DomainRecord } from "@certd/plugin-lib";
import { merge } from "lodash-es";

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
    const params: any = {
      command: "list_domain",
      key: this.apiKey,
    };
    if (req.searchKey) {
      params.search = req.searchKey;
    }

    const res = await this.doRequest(params);

    const domains = res.ListDomainResponse?.DomainList || [];
    const list = domains.map((item: any) => ({
      id: item.Name || item.DomainName,
      domain: item.Name || item.DomainName,
    }));

    return {
      total: list.length,
      list,
    };
  }

  async doRequest(params: any = null) {
    params = merge(
      {
        key: this.apiKey,
      },
      params
    );
    const res = await this.ctx.http.request<any, any>({
      url: "/api3.json",
      baseURL: "https://api.dynadot.com",
      method: "get",
      params,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.checkApiError(res);
    return res;
  }

  private checkApiError(res: any) {
    if (!res || typeof res !== "object") {
      return;
    }
    for (const key of Object.keys(res)) {
      const value = res[key];
      if (value && typeof value === "object" && "ResponseCode" in value) {
        const code = value.ResponseCode;
        if (code !== 0 && code !== "0") {
          const errorMsg = value.Error || value.Status || JSON.stringify(value);
          throw new Error(`Dynadot API错误: ${errorMsg}`);
        }
      }
    }
  }
}

new DynadotAccess();
