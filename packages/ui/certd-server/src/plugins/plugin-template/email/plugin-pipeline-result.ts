import { AddonInput, IsAddon } from "@certd/lib-server";
import { BuildContentReq, EmailContent, ITemplateProvider } from "../api.js";
import { BaseEmailTemplateProvider } from "./plugin-base.js";

@IsAddon({
  addonType: "emailTemplate",
  name: 'pipelineResult',
  title: '流水线执行结果邮件模版',
  desc: '流水线执行结果邮件模版',
  icon: "simple-icons:email:blue",
  showTest: false,
})
export class PipelineResultEmailTemplateProvider extends BaseEmailTemplateProvider implements ITemplateProvider<EmailContent> {
  @AddonInput({
    title: "可用参数",
    component: {
      name: "ParamsShow",
      params:[
        {labele:"运行结果",value:"pipelineResult"},
        {labele:"流水线标题",value:"pipelineTitle"},
        {labele:"流水线ID",value:"pipelineId"},
        {labele:"运行Id",value:"historyId"},
        {labele:"错误信息",value:"errors"},
        {labele:"URL",value:"url"},
      ]
    },
    order: 5,
    col: { span: 24 },
  })
  paramIntro = "";


  async buildDefaultContent(req:BuildContentReq) {
    const defaultTemplate = new PipelineResultEmailTemplateProvider()

    const subject = "${result}，${pipelineTitle}【${pipelineId}】";
    const content = "流水线ID:${pipelineId}，运行ID:${runtimeId} \n\n ${errors}";
    defaultTemplate.titleTemplate = subject
    defaultTemplate.contentTemplate = content
    defaultTemplate.formatType = "text"
    return await defaultTemplate.buildContent(req)
  }

}
