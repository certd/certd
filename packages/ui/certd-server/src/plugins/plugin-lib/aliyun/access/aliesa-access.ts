import { AccessInput, BaseAccess, IsAccess, Pager, PageRes, PageSearch } from "@certd/pipeline";
import { DomainRecord } from "@certd/plugin-lib";
import { AliyunAccess } from "./aliyun-access.js";

@IsAccess({
  name: "aliesa",
  title: "阿里云ESA授权",
  desc: "",
  icon: "ant-design:aliyun-outlined",
  order: 0,
})
export class AliesaAccess extends BaseAccess {
  @AccessInput({
    title: "阿里云授权",
    component: {
      name: "access-selector",
      vModel: "modelValue",
      type: "aliyun",
    },
    helper: "请选择阿里云授权",
    required: true,
  })
  accessId = "";

  @AccessInput({
    title: "地区",
    component: {
      name: "a-select",
      vModel: "value",
      options: [
        {
          label: "杭州",
          value: "cn-hangzhou",
        },
        {
          label: "新加坡",
          value: "ap-southeast-1",
        },
      ],
    },
    helper: "请选择ESA地区",
    required: true,
  })
  region = "";


   @AccessInput({
    title: "测试",
    component: {
      name: "api-test",
      action: "TestRequest"
    },
    helper: "点击测试接口是否正常"
  })
  testRequest = true;

  async onTestRequest() {
    await this.getDomainListPage({
      pageNo: 1,
      pageSize: 1,
    });
    return "ok"
  }


  async getEsaClient(){
    const access: AliesaAccess = this
    const aliAccess = await this.ctx.accessService.getById(access.accessId) as AliyunAccess
    const endpoint = `esa.${access.region}.aliyuncs.com`
    return aliAccess.getClient(endpoint)
  }

   async getDomainListPage(req: PageSearch): Promise<PageRes<DomainRecord>> {
      const pager = new Pager(req)
      const client = await this.getEsaClient()
      const ret = await client.doRequest({
        // 接口名称
        action: "ListSites",
        // 接口版本
        version: "2024-09-10",
        // 接口协议
        protocol: "HTTPS",
        // 接口 HTTP 方法
        method: "GET",
        authType: "AK",
        style: "RPC",
        data: {
          query: {
            SiteName: req.searchKey,
            // ["SiteSearchType"] = "exact";
            SiteSearchType: "fuzzy",
            AccessType: "NS",
            PageSize: pager.pageSize,
            PageNumber: pager.pageNo,
          }
        }
      })
      const list = ret.Sites?.map(item => ({
        domain: item.SiteName,
        id: item.SiteId,
      })) 
      return {
        list: list || [],
        total: ret.TotalCount,
      }
    }
}

new AliesaAccess();
