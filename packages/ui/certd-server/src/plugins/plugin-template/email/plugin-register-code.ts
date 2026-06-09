import { AddonInput, IsAddon } from "@certd/lib-server";
import { BuildContentReq, EmailContent, ITemplateProvider } from "../api.js";
import { BaseEmailTemplateProvider } from "./plugin-base.js";

@IsAddon({
  addonType: "emailTemplate",
  name: "registerCode",
  title: "注册验证码邮件模版",
  desc: "您的注册验证码为：xxxx，请勿泄露",
  icon: "simple-icons:email:blue",
  showTest: false,
})
export class RegisterCodeEmailTemplateProvider extends BaseEmailTemplateProvider implements ITemplateProvider<EmailContent> {
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
    const defaultTemplate = new RegisterCodeEmailTemplateProvider();
    defaultTemplate.titleTemplate = "注册验证码";
    defaultTemplate.contentTemplate = "您的注册验证码是:${code}，请勿泄露";
    defaultTemplate.formatType = "text";
    return await defaultTemplate.buildContent(req);
  }
}
