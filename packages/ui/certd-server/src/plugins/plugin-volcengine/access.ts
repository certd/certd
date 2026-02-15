import { AccessInput, BaseAccess, IsAccess } from '@certd/pipeline';
import { VolcengineClient } from './ve-client.js';

/**
 * 这个注解将注册一个授权配置
 * 在certd的后台管理系统中，用户可以选择添加此类型的授权
 */
@IsAccess({
  name: 'volcengine',
  title: '火山引擎',
  desc: '',
  icon: 'svg:icon-volcengine',
  order: 1,
})
export class VolcengineAccess extends BaseAccess {

  @AccessInput({
    title: 'AccessKeyID',
    component: {
      placeholder: 'AccessKeyID',
    },
    helper: "[获取密钥](https://console.volcengine.com/iam/keymanage/)",
    required: true,
  })
  accessKeyId = '';
  @AccessInput({
    title: 'SecretAccessKey',
    component: {
      placeholder: 'SecretAccessKey',
    },
    required: true,
    encrypt: true,
  })
  secretAccessKey = '';


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

  async getCallerIdentity() {
    const veClient = new VolcengineClient({
      access: this,
      logger: this.ctx.logger,
      http: this.ctx.http,
    });
    const service = await veClient.getStsService();

    const res = await service.request({
      action: "GetCallerIdentity",
    });

    const result = res.Result || {};
    this.ctx.logger.info("✅ 密钥有效！");
    this.ctx.logger.info(`   账户ID: ${result.AccountId}`);
    this.ctx.logger.info(`   ARN: ${result.Trn}`);
    this.ctx.logger.info(`   用户ID: ${result.IdentityId}`);

    return {
      valid: true,
      accountId: result.AccountId,
      arn: result.Trn,
      userId: result.IdentityId
    };

  }


}

new VolcengineAccess();
