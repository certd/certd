import { AddonInput, IsAddon } from "@certd/lib-server";
import { BuildContentReq, EmailContent, ITemplateProvider } from "../api.js";
import { BaseEmailTemplateProvider } from "./plugin-base.js";

@IsAddon({
  addonType: "emailTemplate",
  name: 'common',
  title: '通用邮件模版',
  desc: '使用通用的邮件标题和内容，内容外部可以自定义html进行美化',
  icon: "simple-icons:email:blue",
  showTest: false,
})
export class CommonEmailTemplateProvider extends BaseEmailTemplateProvider implements ITemplateProvider<EmailContent> {
  @AddonInput({
    title: "可用参数",
    component: {
      name: "ParamsShow",
      params:[
        {label:"标题",value:"title"},
        {label:"内容",value:"content"},
        {label:"URL",value:"url"}
      ]
    },
    col: { span: 24 },
  })
  paramIntro = "";


  async buildDefaultContent(req:BuildContentReq) {
    const defaultTemplate = new CommonEmailTemplateProvider()
    defaultTemplate.titleTemplate = "${title}"
    defaultTemplate.contentTemplate = "${content} \n\n 查看详情：${url}"
    defaultTemplate.formatType = "text"
    return await defaultTemplate.buildContent(req)
  }


}
