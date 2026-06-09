import { AccessInput, BaseAccess, IsAccess, Pager, PageRes, PageSearch } from "@certd/pipeline";
import { DomainRecord } from "@certd/plugin-lib";

/**
 * 这个注解将注册一个授权配置
 * 在certd的后台管理系统中，用户可以选择添加此类型的授权
 */
@IsAccess({
  name: "jdcloud",
  title: "京东云",
  desc: "",
  icon: "svg:icon-jdcloud",
  order: 1,
})
export class JDCloudAccess extends BaseAccess {
  @AccessInput({
    title: "AccessKeyID",
    component: {
      placeholder: "AccessKeyID",
    },
    helper: "[获取密钥](https://uc.jdcloud.com/account/accesskey)",
    required: true,
  })
  accessKeyId = "";
  @AccessInput({
    title: "SecretAccessKey",
    component: {
      placeholder: "SecretAccessKey",
    },
    required: true,
    encrypt: true,
  })
  secretAccessKey = "";

  @AccessInput({
    title: "测试",
    component: {
      name: "api-test",
      action: "TestRequest",
    },
    helper: "点击测试接口是否正常",
  })
  testRequest = true;

  accessToken: { expiresAt: number; token: string };

  async onTestRequest() {
    await this.getDomainListPage({
      pageNo: 1,
      pageSize: 1,
    });
    return "ok";
  }

  async getJDDomainService() {
    const { JDDomainService } = await import("@certd/jdcloud");
    const service = new JDDomainService({
      credentials: {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
      },
      regionId: "cn-north-1", //地域信息，某个api调用可以单独传参regionId，如果不传则会使用此配置中的regionId
    });
    return service;
  }

  async getDomainListPage(req: PageSearch): Promise<PageRes<DomainRecord>> {
    const pager = new Pager(req);
    const service = await this.getJDDomainService();
    const domainRes = await this.catchCall(() =>
      service.describeDomains({
        domainName: req.searchKey,
        pageNumber: pager.pageNo,
        pageSize: pager.pageSize,
      })
    );
    let list = domainRes.result?.dataList || [];
    list = list.map((item: any) => ({
      id: item.domainId,
      domain: item.domainName,
    }));
    return {
      total: domainRes.result.totalCount || list.length,
      list,
    };
  }
  async catchCall<T = any>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      if (e.error) {
        this.ctx.logger.error(JSON.stringify(e.error));
        throw new Error(JSON.stringify(e.error));
      }
      throw e;
    }
  }
}

new JDCloudAccess();
