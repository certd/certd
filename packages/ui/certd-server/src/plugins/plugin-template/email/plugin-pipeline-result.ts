import { AddonInput, IsAddon } from "@certd/lib-server";
import { BuildContentReq, EmailContent, ITemplateProvider } from "../api.js";
import { BaseEmailTemplateProvider } from "./plugin-base.js";

@IsAddon({
  addonType: "emailTemplate",
  name: "pipelineResult",
  title: "流水线执行结果邮件模版",
  desc: "执行失败，xxxx自动化【流水线id】；运行ID:xxx,错误信息:xxxx",
  icon: "simple-icons:email:blue",
  showTest: false,
})
export class PipelineResultEmailTemplateProvider extends BaseEmailTemplateProvider implements ITemplateProvider<EmailContent> {
  @AddonInput({
    title: "可用参数",
    component: {
      name: "ParamsShow",
      params: [
        { label: "运行结果", value: "pipelineResult" },
        { label: "流水线标题", value: "pipelineTitle" },
        { label: "流水线ID", value: "pipelineId" },
        { label: "运行Id", value: "historyId" },
        { label: "错误信息", value: "errors" },
        { label: "URL", value: "url" },
      ],
    },
    col: { span: 24 },
  })
  paramIntro = "";

  async buildDefaultContent(req: BuildContentReq) {
    const defaultTemplate = new PipelineResultEmailTemplateProvider();

    const subject = "${result}，${pipelineTitle}【${pipelineId}】";
    const content = "流水线ID:${pipelineId}，运行ID:${runtimeId} \n\n ${errors}";
    defaultTemplate.titleTemplate = subject;
    defaultTemplate.contentTemplate = content;
    defaultTemplate.formatType = "text";
    return await defaultTemplate.buildContent(req);
  }
}
