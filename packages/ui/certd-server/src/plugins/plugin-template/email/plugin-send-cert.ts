import { AddonInput, IsAddon } from "@certd/lib-server";
import { BuildContentReq, EmailContent, ITemplateProvider } from "../api.js";
import { BaseEmailTemplateProvider } from "./plugin-base.js";

@IsAddon({
  addonType: "emailTemplate",
  name: "sendCert",
  title: "发送证书邮件模版",
  desc: "邮件发送证书插件的邮件模版",
  icon: "simple-icons:email:blue",
  showTest: false,
})
export class SendCertEmailTemplateProvider extends BaseEmailTemplateProvider implements ITemplateProvider<EmailContent> {
  @AddonInput({
    title: "可用参数",
    component: {
      name: "ParamsShow",
      params: [
        /**
         *  mainDomain,
               domains,
               expiresTime: dayjs(certReader.expires).format("YYYY-MM-DD HH:mm:ss"),
               remark: this.remark || "",
               crt: this.cert.crt,
               key: this.cert.key,
               ic: this.cert.ic,
         */
        { label: "主域名", value: "mainDomain" },
        { label: "全部域名", value: "domains" },
        { label: "过期时间", value: "expiresTime" },
        { label: "备注", value: "remark" },
        { label: "证书内容", value: "crt" },
        { label: "私钥内容", value: "key" },
        { label: "中间证书", value: "ic" },
      ],
    },
    col: { span: 24 },
  })
  paramIntro = "";

  async buildDefaultContent(req: BuildContentReq) {
    const defaultTemplate = new SendCertEmailTemplateProvider();
    defaultTemplate.titleTemplate = "${title}";
    defaultTemplate.contentTemplate = "${content}";
    defaultTemplate.formatType = "text";
    return await defaultTemplate.buildContent(req);
  }
}
