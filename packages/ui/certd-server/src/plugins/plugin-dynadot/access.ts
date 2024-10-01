import { AccessInput, BaseAccess, IsAccess } from '@certd/pipeline';

/**
 * 这个注解将注册一个授权配置
 * 在certd的后台管理系统中，用户可以选择添加此类型的授权
 */
@IsAccess({
  name: 'dynadot',
  title: 'dynadot授权',
  desc: '************\n注意：申请证书时会覆盖已有的域名解析配置，慎用\n************\n待优化，主要是dynadot的接口一言难尽',
})
export class DynadotAccess extends BaseAccess {
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
