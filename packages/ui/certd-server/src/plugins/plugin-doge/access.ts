import { IsAccess, AccessInput } from '@certd/pipeline';

/**
 * 这个注解将注册一个授权配置
 * 在certd的后台管理系统中，用户可以选择添加此类型的授权
 */
@IsAccess({
  name: 'dogecloud',
  title: '多吉云',
  desc: '',
})
export class DogeCloudAccess {
  /**
   * 授权属性配置
   */
  @AccessInput({
    title: 'AccessKey',
    component: {
      placeholder: 'AccessKey',
    },
    helper: '请前往[多吉云-密钥管理](https://console.dogecloud.com/user/keys)获取',
    required: true,
    encrypt: false,
  })
  accessKey = '';

  @AccessInput({
    title: 'SecretKey',
    component: {
      placeholder: 'SecretKey',
    },
    helper: '请前往[多吉云-密钥管理](https://console.dogecloud.com/user/keys)获取',
    required: true,
    encrypt: true,
  })
  secretKey = '';
}

new DogeCloudAccess();
