import { IsAccess, AccessInput, BaseAccess } from "@certd/pipeline";

/**
 * 这个注解将注册一个授权配置
 * 在certd的后台管理系统中，用户可以选择添加此类型的授权
 */
@IsAccess({
  name: "lucky",
  title: "lucky",
  desc: "",
  icon: "svg:icon-lucky",
})
export class LuckyAccess extends BaseAccess {
  /**
   * 授权属性配置
   */
  @AccessInput({
    title: "访问url",
    component: {
      placeholder: "http://xxx.xx.xx:16301",
    },
    helper: "不要带安全入口",
    required: true,
    encrypt: false,
  })
  url = "";

  @AccessInput({
    title: "安全入口",
    component: {
      placeholder: "/your_safe_path",
    },
    helper: "请参考lucky设置中关于安全入口的配置，",
    required: false,
    encrypt: true,
  })
  safePath = "";

  /**
   * 授权属性配置
   */
  @AccessInput({
    title: "OpenToken",
    component: {
      placeholder: "OpenToken",
    },
    helper: "设置->最下面开发者设置->启用OpenToken",
    required: true,
    encrypt: true,
  })
  openToken = "";
}

new LuckyAccess();
