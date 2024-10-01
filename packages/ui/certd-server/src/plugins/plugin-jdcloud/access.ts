import { AccessInput, BaseAccess, IsAccess } from '@certd/pipeline';

/**
 * 这个注解将注册一个授权配置
 * 在certd的后台管理系统中，用户可以选择添加此类型的授权
 */
@IsAccess({
  name: 'jdcloud',
  title: '京东云授权',
  desc: '暂时无法成功申请，还没测试通过',
})
export class JDCloudAccess extends BaseAccess {
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
