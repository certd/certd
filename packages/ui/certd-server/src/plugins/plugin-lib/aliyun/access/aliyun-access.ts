import { AccessInput, BaseAccess, IsAccess } from "@certd/pipeline";
import { AliyunClientV2 } from "../lib/aliyun-client-v2.js";
import { AliyunSslClient } from "../lib/ssl-client.js";
@IsAccess({
  name: "aliyun",
  title: "阿里云授权",
  desc: "",
  icon: "ant-design:aliyun-outlined",
  order: 0,
})
export class AliyunAccess extends BaseAccess {
  @AccessInput({
    title: "accessKeyId",
    component: {
      placeholder: "accessKeyId",
    },
    helper: "登录阿里云控制台->AccessKey管理页面获取。",
    required: true,
  })
  accessKeyId = "";
  @AccessInput({
    title: "accessKeySecret",
    component: {
      placeholder: "accessKeySecret",
    },
    required: true,
    encrypt: true,
    helper: "注意：证书申请需要dns解析权限；其他阿里云插件，需要对应的权限，比如证书上传需要证书管理权限；嫌麻烦就用主账号的全量权限的accessKey",
  })
  accessKeySecret = "";

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
    await this.getCallerIdentity();
    return "ok";
  }


  async getStsClient() {
    const StsClient = await import('@alicloud/sts-sdk');

    // 配置凭证
    const sts = new StsClient.default({
      endpoint: 'sts.aliyuncs.com',
      accessKeyId: this.accessKeyId,
      accessKeySecret: this.accessKeySecret,
    });

    return sts
  }


  async getCallerIdentity() {

    const sts = await this.getStsClient();
    // 调用 GetCallerIdentity 接口
    const result = await sts.getCallerIdentity();
    if (result.Code || !result.AccountId) {
      const message = result.Message || "阿里云密钥校验失败";
      const code = result.Code ? `[${result.Code}] ` : "";
      throw new Error(`${code}${message}`);
    }

    this.ctx.logger.log("✅ 密钥有效！");
    this.ctx.logger.log(`   账户ID: ${result.AccountId}`);
    this.ctx.logger.log(`   ARN: ${result.Arn}`);
    this.ctx.logger.log(`   用户ID: ${result.UserId}`);

    return {
      valid: true,
      accountId: result.AccountId,
      arn: result.Arn,
      userId: result.UserId
    };
  }


  getSslClient({ endpoint }: { endpoint: string }) {
    const client = new AliyunSslClient({
      access: this,
      logger: this.ctx.logger,
      endpoint,
    });
    return client
  }



  getClient(endpoint: string) {
    return new AliyunClientV2({
      access: this,
      logger: this.ctx.logger,
      endpoint: endpoint,
    });
  }
}

new AliyunAccess();
