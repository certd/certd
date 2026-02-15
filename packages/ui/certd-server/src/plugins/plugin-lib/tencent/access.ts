import { IsAccess, AccessInput, BaseAccess } from "@certd/pipeline";

@IsAccess({
  name: "tencent",
  title: "腾讯云",
  icon: "svg:icon-tencentcloud",
  order: 0,
})
export class TencentAccess extends BaseAccess {
  @AccessInput({
    title: "secretId",
    helper: "使用对应的插件需要有对应的权限，比如上传证书，需要证书管理权限;部署到clb需要clb相关权限\n前往[密钥管理](https://console.cloud.tencent.com/cam/capi)进行创建",
    component: {
      placeholder: "secretId",
    },
    rules: [{ required: true, message: "该项必填" }],
  })
  secretId = "";
  @AccessInput({
    title: "secretKey",
    component: {
      placeholder: "secretKey",
    },
    encrypt: true,
    rules: [{ required: true, message: "该项必填" }],
  })
  secretKey = "";

  @AccessInput({
    title: "站点类型",
    value: "cn",
    component: {
      name: "a-select",
      options: [
        {
          label: "国内站",
          value: "cn",
        },
        {
          label: "国际站",
          value: "intl",
        },
      ],
    },
    encrypt: false,
    rules: [{ required: true, message: "该项必填" }],
  })
  accountType: string;

  @AccessInput({
    title: "关闭证书过期通知",
    value: true,
    component: {
      name: "a-switch",
      vModel: "checked",
    },
  })
  closeExpiresNotify: boolean = true;


    
  @AccessInput({
    title: "测试",
    component: {
      name: "api-test",
      action: "onTestRequest",
    },
    helper: "点击测试接口看是否正常",
  })
  testRequest = true;

  async onTestRequest() {
    await this.getCallerIdentity();
    return "ok";
  }


  isIntl() {
    return this.accountType === "intl";
  }

  intlDomain() {
    return this.isIntl() ? "intl." : "";
  }

  buildEndpoint(endpoint: string) {
    return `${this.intlDomain()}${endpoint}`;
  }

  async getCallerIdentity(){
    const client = await this.getStsClient();

     // 调用 GetCallerIdentity 接口
    const result = await client.GetCallerIdentity();
    
    this.ctx.logger.info("✅ 密钥有效！");
    this.ctx.logger.info(`   账户ID: ${result.AccountId}`);
    this.ctx.logger.info(`   ARN: ${result.Arn}`);
    this.ctx.logger.info(`   用户ID: ${result.UserId}`);
    
    return {
      valid: true,
      accountId: result.AccountId,
      arn: result.Arn,
      userId: result.UserId
    };
  }


  async getStsClient(){
    const sdk = await import('tencentcloud-sdk-nodejs/tencentcloud/services/sts/v20180813/index.js');
    const StsClient = sdk.v20180813.Client;

    const clientConfig = {
      credential: {
        secretId: this.secretId,
        secretKey: this.secretKey,
      },
      region: 'ap-shanghai',
      profile: {
        httpProfile: {
          endpoint: `sts.${this.intlDomain()}tencentcloudapi.com`,
        },
      },
    };

    return new StsClient(clientConfig);
  }
}
