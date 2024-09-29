import { IsAccess, AccessInput, IAccess } from '@certd/pipeline';

/**
 * 这个注解将注册一个授权配置
 * 在certd的后台管理系统中，用户可以选择添加此类型的授权
 */
@IsAccess({
  name: 'demo',
  title: '授权插件示例',
  desc: '',
})
export class DemoAccess implements IAccess {
  /**
   * 授权属性配置
   */
  @AccessInput({
    title: '密钥Id',
    component: {
      placeholder: 'demoKeyId',
    },
    required: true,
  })
  demoKeyId = '';

  /**
   * 授权属性配置
   */
  @AccessInput({
    //标题
    title: '密钥串',
    component: {
      //input组件的placeholder
      placeholder: 'demoKeySecret',
    },
    //是否必填
    required: true,
    //改属性是否需要加密
    encrypt: true,
  })
  //属性名称
  demoKeySecret = '';
}

if (process.env.NODE_ENV === 'development') {
  //你的实现 要去掉这个if，不然生产环境将不会显示
  new DemoAccess();
}
