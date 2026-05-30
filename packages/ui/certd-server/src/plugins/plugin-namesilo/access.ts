import { IsAccess, AccessInput, BaseAccess, PageSearch, PageRes, Pager } from "@certd/pipeline";
import { DomainRecord } from "@certd/plugin-lib";
import { merge } from "lodash-es";
import qs from "qs";
/**
 * 这个注解将注册一个授权配置
 * 在certd的后台管理系统中，用户可以选择添加此类型的授权
 */
@IsAccess({
  name: "namesilo",
  title: "namesilo授权",
  desc: "",
  icon: "simple-icons:namesilo",
})
export class NamesiloAccess extends BaseAccess {
  /**
   * 授权属性配置
   */
  @AccessInput({
    title: "API Key",
    component: {
      placeholder: "api key",
    },
    helper: "前往 [获取API Key](https://www.namesilo.com/account/api-manager)\n不要勾选第一项（Generate key for read-only access）\n勾选第二项（Submitting this form...）\n然后点击Generate按钮",
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
    const pager = new Pager(req);
    const ret = await this.doRequest("/api/listDomains", {
      key: req.searchKey,
      page: pager.pageNo,
      pageSize: pager.pageSize,
    });
    let list = ret.domains || [];
    // this.logger.info("获取域名列表成功:", ret);
    list = list.map((item: any) => ({
      id: item.domain,
      domain: item.domain,
    }));
    return {
      total: ret.pager?.total || list.length,
      list,
    };
  }

  async doRequest(url: string, params: any = null) {
    params = merge(
      {
        version: 1,
        type: "json",
        key: this.apiKey,
      },
      params
    );
    const qsString = qs.stringify(params);
    url = `${url}?${qsString}`;
    const res = await this.ctx.http.request<any, any>({
      url,
      baseURL: "https://www.namesilo.com",
      method: "get",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (res.reply?.code !== "300" && res.reply?.code !== 300 && res.reply?.detail !== "success") {
      throw new Error(`${JSON.stringify(res.reply.detail)}`);
    }
    return res.reply;
  }
}

new NamesiloAccess();
