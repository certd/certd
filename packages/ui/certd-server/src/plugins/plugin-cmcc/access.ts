import { AccessInput, BaseAccess, IsAccess } from "@certd/pipeline";
import { CmccClient } from "./cmcc-client.js";

/**
 * 
 *  tenantId: string;
  tenantKey: string;
  endpoint?: string;
 */
@IsAccess({
  name: "cmcc",
  title: "中国移动CND授权",
  desc: "",
  icon: "svg:cmcc",
})
export class CmccAccess extends BaseAccess {
  @AccessInput({
    title: "TenantID",
    component: {
      placeholder: "TenantID",
    },
    required: true,
  })
  tenantId = "";

  @AccessInput({
    title: "TenantKey",
    component: {
      placeholder: "TenantKey",
    },
    required: true,
    encrypt: true,
  })
  tenantKey = "";

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
    const client = await this.getCmccClient();
    await client.getDomainList({});
    return "ok";
  }

  async getCmccClient() {
    return new CmccClient({
      tenantId: this.tenantId,
      tenantKey: this.tenantKey,
      http: this.ctx.http,
      logger: this.ctx.logger,
    });
  }
}

new CmccAccess();
