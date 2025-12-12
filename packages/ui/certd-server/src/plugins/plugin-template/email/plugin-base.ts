import { AddonInput, BaseAddon } from "@certd/lib-server";
import { BuildContentReply, BuildContentReq, ITemplateProvider } from "../api.js";
import { get } from "lodash-es";


export class BaseEmailTemplateProvider extends BaseAddon implements ITemplateProvider {
  @AddonInput({
    title: "配置说明",
    component:{
      name:"a-alert",
      props:{
        type:"info",
        message:"在标题和内容模版中，通过${param}引用参数，例如： 感谢注册${siteTitle}，您的注册验证码为：${code}",
      }
    },
    order: 1,
    col:{span:24},
  })
  useIntro = "";

  @AddonInput({
    title: "邮件标题模版",
    required: true,
    order: 10,
  })
  titleTemplate = "";

  @AddonInput({
    title: "邮件内容模版",
    component: {
      placeholder: "邮件内容模版",
    },
    order: 20,
    required: true,
  })
  contentTemplate = "";


  async buildContent(params: BuildContentReq) : Promise<BuildContentReply>{
     const title = this.compile(this.titleTemplate)(params.data)
     const content = this.compile(this.contentTemplate)(params.data)
     return {
       title,
       content,
     }
  };

  compile(templateString: string) {
    return function(data:any):string {
      return templateString.replace(/\${(.*?)}/g, (match, key) => {
        const value = get(data, key, '');
        return String(value);
      });
    };
  }

}
