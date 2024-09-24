import { AccessInput, IsAccess } from '@certd/pipeline';

/**
 * 这个注解将注册一个授权配置
 * 在certd的后台管理系统中，用户可以选择添加此类型的授权
 */
@IsAccess({
  name: 'jdcloud',
  title: '京东云授权',
  desc: '目前设置dns解析会覆盖已有的解析配置，慎用',
})
export class JDCloudAccess {
  /**
   * 授权属性配置
   */
  @AccessInput({
    title: 'AccessKeyId',
    component: {
      placeholder: 'AK',
    },
    helper: '前往 [AccessKey管理](https://uc.jdcloud.com/account/accesskey) 获取 API Production Key',
    required: true,
    encrypt: true,
  })
  accessKeyId = '';

  @AccessInput({
    title: 'AccessKeySecret',
    component: {
      placeholder: 'SK',
    },
    helper: 'SK',
    required: true,
    encrypt: true,
  })
  accessKeySecret = '';
}

new JDCloudAccess();
