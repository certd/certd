import { AddonInput, IsAddon } from "@certd/lib-server";
import { BuildContentReq, EmailContent, ITemplateProvider } from "../api.js";
import { BaseEmailTemplateProvider } from "./plugin-base.js";

@IsAddon({
  addonType: "emailTemplate",
  name: "forgotPassword",
  title: "忘记密码邮件模版",
  desc: "您正在重置密码，您的验证码为xxxx，请勿泄露",
  icon: "simple-icons:email:blue",
  showTest: false,
})
export class ForgotPasswordEmailTemplateProvider extends BaseEmailTemplateProvider implements ITemplateProvider<EmailContent> {
  @AddonInput({
    title: "可用参数",
    component: {
      name: "ParamsShow",
      params: [{ label: "验证码", value: "code" }],
    },
    col: { span: 24 },
  })
  paramIntro = "";

  async buildDefaultContent(req: BuildContentReq) {
    const defaultTemplate = new ForgotPasswordEmailTemplateProvider();
    defaultTemplate.titleTemplate = "忘记密码";
    defaultTemplate.contentTemplate = "您的验证码是:${code}，请勿泄露";
    defaultTemplate.formatType = "text";
    return await defaultTemplate.buildContent(req);
  }
}
