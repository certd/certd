import { AccessInput, IsAccess } from '@certd/pipeline';

/**
 * 这个注解将注册一个授权配置
 * 在certd的后台管理系统中，用户可以选择添加此类型的授权
 */
@IsAccess({
  name: 'dynadot',
  title: 'dynadot授权',
  desc: '目前设置dns解析会覆盖已有的解析配置，慎用',
})
export class DynadotAccess {
  /**
   * 授权属性配置
   */
  @AccessInput({
    title: 'API Production Key',
    component: {
      placeholder: '授权key',
    },
    helper: '前往 [Dynadot API](https://www.dynadot.com/account/domain/setting/api.html) 获取 API Production Key',
    required: true,
    encrypt: true,
  })
  apiProductionKey = '';
}

new DynadotAccess();
