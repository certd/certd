import { AddonInput, BaseAddon } from "@certd/lib-server";
import { BuildContentReq, EmailContent, ITemplateProvider } from "../api.js";

export class BaseEmailTemplateProvider extends BaseAddon implements ITemplateProvider<EmailContent> {
  @AddonInput({
    title: "配置说明",
    component: {
      name: "a-alert",
      props: {
        type: "info",
        message: "在标题和内容模版中，通过${name}引用参数，例如： 感谢注册，您的注册验证码为：${code}",
      }
    },
    order: -9,
    col: { span: 24 },
  })
  useIntro = "";


  @AddonInput({
    title: "邮件格式",
    component: {
      name: "a-select",
      props: {
        options: [
          { label: "HTML", value: "html" },
          { label: "TEXT", value: "text" },
        ]
      }
    },
    order: 9,
    col: { span: 24 },
    required: true,
  })
  formatType = "";

  @AddonInput({
    title: "邮件标题模版",
    required: true,
    order: 10,
    component: {
      name: "a-input",
      props: {
        placeholder: "邮件标题模版",
      }
    },
    col: { span: 24 },
  })
  titleTemplate = "";

  @AddonInput({
    title: "邮件内容模版",
    component: {
      name: "a-textarea",
      rows: 6,
    },
    order: 20,
    col: { span: 24 },
    required: true,
  })
  contentTemplate = "";


  async buildContent(params: BuildContentReq): Promise<EmailContent> {
    const data = {
      title:"",
      content:"",
      url:"",
      ...params.data,
    }
    const title = this.compile(this.titleTemplate)(data)
    const content = this.compile(this.contentTemplate)(data)

    const body: any = {
      subject: title,
    }
    if (this.formatType === "html") {
      body.html = content
    } else {
      body.content = content
    }
    return body
  };

  async buildDefaultContent(params: BuildContentReq): Promise<EmailContent> {
    throw new Error("请实现 buildDefaultContent 方法")
  }

  // compile(templateString: string) {
  //   return function (data: any): string {
  //     return templateString.replace(/\${(.*?)}/g, (match, key) => {
  //       const value = get(data, key?.trim(), '');
  //       return String(value);
  //     });
  //   };
  // }

  compile(templateString:string) {
    return new Function('data', `    with(data || {}) {
        return \`${templateString}\`;
      }
    `);
  }

}
