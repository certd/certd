import { AddonInput, IsAddon } from "@certd/lib-server";
import { BaseEmailTemplateProvider } from "./plugin-base.js";

@IsAddon({
  addonType: "emailTemplate",
  name: 'register',
  title: '注册邮件模版',
  desc: '注册邮件模版',
  icon:"simple-icons:gitee:red",
  showTest: false,
})
export class RegisterEmailTemplateProvider extends BaseEmailTemplateProvider  {

  @AddonInput({
    title: "可用参数",
    component:{
      name:"a-alert",
      props:{
        type:"info",
        message:"站点名称:${siteTitle}；注册验证码:${code}；有效期:${duration}分钟",
      }
    },
     order: 5,
    col:{span:24},
  })
  paramIntro = "";

}
