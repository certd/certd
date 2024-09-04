import { IsAccess, AccessInput } from '@certd/pipeline';

/**
 * 这个注解将注册一个授权配置
 * 在certd的后台管理系统中，用户可以选择添加此类型的授权
 */
@IsAccess({
  name: 'west',
  title: '西部数码授权',
  desc: '',
})
export class WestAccess {
  /**
   * 授权属性配置
   */
  @AccessInput({
    title: 'ApiKey',
    component: {
      placeholder: 'apidomainkey',
    },
    helper:'前往https://www.west.cn/manager/domain/ 进入对应域名管理页面，上方点击ApiKey获取密钥',
    required: true,
  })
  apidomainkey = '';
}

new WestAccess();
