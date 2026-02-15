import { IsAccess, AccessInput, BaseAccess } from '@certd/pipeline';
import { Dns51Client } from './client.js';

/**
 * 这个注解将注册一个授权配置
 * 在certd的后台管理系统中，用户可以选择添加此类型的授权
 */
@IsAccess({
  name: '51dns',
  title: '51dns授权',
  icon: 'arcticons:dns-changer-3',
  desc: '',
})
export class Dns51Access extends BaseAccess {
  /**
   * 授权属性配置
   */
  @AccessInput({
    title: '用户名',
    component: {
      placeholder: '用户名或手机号',
    },
    required: true,
    encrypt: false,
  })
  username = '';

  @AccessInput({
    title: '登录密码',
    component: {
      name: "a-input-password",
      vModel: "value",
      placeholder: '密码',
    },
    required: true,
    encrypt: true,
  })
  password = '';

  @AccessInput({
    title: "测试",
    component: {
      name: "api-test",
      action: "TestRequest"
    },
    helper: "测试授权是否正确"
  })
  testRequest = true;

  async onTestRequest() {

    const client = new Dns51Client({
      logger: this.ctx.logger,
      access: this,
    });

    await client.login();

    return "ok";
  }


}

new Dns51Access();
