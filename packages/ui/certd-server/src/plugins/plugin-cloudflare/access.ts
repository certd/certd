import { IsAccess, AccessInput } from '@certd/pipeline';

/**
 * 这个注解将注册一个授权配置
 * 在certd的后台管理系统中，用户可以选择添加此类型的授权
 */
@IsAccess({
  name: 'cloudflare',
  title: 'cloudflare授权',
  desc: '',
})
export class CloudflareAccess {
  /**
   * 授权属性配置
   */
  @AccessInput({
    title: 'API Token',
    component: {
      placeholder: 'api token',
    },
    helper: '前往 https://dash.cloudflare.com/profile/api-tokens 获取token',
    required: true,
  })
  apiToken = '';
}

new CloudflareAccess();
