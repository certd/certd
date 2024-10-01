import { IsAccess, AccessInput, BaseAccess } from '@certd/pipeline';

/**
 * 这个注解将注册一个授权配置
 * 在certd的后台管理系统中，用户可以选择添加此类型的授权
 */
@IsAccess({
  name: 'west',
  title: '西部数码授权',
  desc: '',
})
export class WestAccess extends BaseAccess {
  /**
   * 授权属性配置
   */
  @AccessInput({
    title: '权限范围',
    component: {
      name: 'a-select',
      vModel: 'value',
      options: [
        { value: 'account', label: '账户级别，对所有域名都有权限管理' },
        { value: 'domain', label: '域名级别，仅能管理单个域名' },
      ],
    },
    helper: '选择权限范围',
    required: true,
  })
  scope = '';

  /**
   * 授权属性配置
   */
  @AccessInput({
    title: '账号',
    helper: '你的登录账号',
    encrypt: false,
    required: false,
    mergeScript: `
    return {
      show:ctx.compute(({form})=>{
        return form.access.scope === 'account'
      })
    }
    `,
  })
  username = '';

  /**
   * 授权属性配置
   */
  @AccessInput({
    title: 'ApiKey',
    component: {
      placeholder: '账户级别的key，对整个账户都有管理权限',
    },
    helper: '账户级别的key，对整个账户都有管理权限\n前往https://www.west.cn/manager/API/APIconfig.asp，手动设置“api连接密码”',
    encrypt: true,
    required: false,
    mergeScript: `
    return {
      show:ctx.compute(({form})=>{
        return form.access.scope === 'account'
      })
    }
    `,
  })
  apikey = '';

  /**
   * 授权属性配置
   */
  @AccessInput({
    title: 'apidomainkey',
    component: {
      placeholder: '域名级别的key，仅对单个域名有权限',
    },
    helper: '域名级别的key，仅对单个域名有权限。 \n前往[西部数据域名管理](https://www.west.cn/manager/domain/)，点击域名，右上方点击ApiKey获取密钥',
    encrypt: true,
    required: false,
    mergeScript: `
    return {
      show:ctx.compute(({form})=>{
        return form.access.scope === 'domain'
      })
    }
    `,
  })
  apidomainkey = '';
}

new WestAccess();
