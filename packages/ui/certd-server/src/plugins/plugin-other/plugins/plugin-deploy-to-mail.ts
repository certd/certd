import { AbstractTaskPlugin, FileItem, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertInfo, CertReader } from "@certd/plugin-cert";
import dayjs from "dayjs";
import { get } from "lodash-es";

@IsTaskPlugin({
  name: "DeployCertToMailPlugin",
  title: "邮件发送证书",
  icon: "ion:mail-outline",
  desc: "通过邮件发送证书",
  group: pluginGroups.other.key,
  showRunStrategy: false,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class DeployCertToMailPlugin extends AbstractTaskPlugin {
  @TaskInput({
    title: "域名证书",
    helper: "请选择前置任务输出的域名证书",
    component: {
      name: "output-selector",
      from: [":cert:"],
    },
    required: true,
  })
  cert!: CertInfo;

  @TaskInput({
    title: "证书压缩文件",
    helper: "请选择前置任务输出的域名证书压缩文件",
    component: {
      name: "output-selector",
      from: [":certZip:"],
    },
    required: true,
  })
  certZip!: FileItem;

  @TaskInput({
    title: "接收邮箱",
    component: {
      name: "EmailSelector",
      vModel: "value",
      mode: "tags",
    },
    required: true,
  })
  email!: string[];

  /**
   *   title:
   *     title: 邮件标题
   *     helper: |-
   *       请输入邮件标题否则将使用默认标题
   *       域名:${certDomains}
   *     component:
   *       name: a-input
   *     required: false
   *   template:
   *     title: 邮件模版
   *     helper: |-
   *       请输入模版内容否则将使用默认模版
   *       域名:${certDomains}
   *     value: |-
   *       尊敬的用户你好:
   *         以下是域名(${certDomains})证书文件
   *     component:
   *       name: a-textarea
   *       autosize:
   *         minRows: 6
   *         maxRows: 10
   *     required: false
   */

  //   @TaskInput({
  //     title: '邮件标题',
  //     component: {
  //       name: 'a-input',
  //       vModel: 'value',
  //       placeholder: `证书申请成功【$\{mainDomain}】`,
  //     },
  //     helper: '请输入邮件标题否则将使用默认标题\n模板变量：主域名=$\{mainDomain}、全部域名=$\{domains}、过期时间=$\{expiresTime}、备注=$\{remark}、证书PEM=$\{crt}、证书私钥=$\{key}、中间证书/CA证书=$\{ic}',
  //     required: false,
  //   })
  //   title!: string;

  //   @TaskInput({
  //     title: '邮件模版',
  //     component: {
  //       name: 'a-textarea',
  //       vModel: 'value',
  //       autosize: {
  //         minRows: 6,
  //         maxRows: 10,
  //       },
  //       placeholder: `
  // <div>
  //   <p>证书申请成功</p>
  //   <p>域名：$\{domains}</p>
  //   <p>证书有效期：$\{expiresTime}</p>
  //   <p>备注：$\{remark}</p>
  // </div>
  // `,
  //     },
  //     helper: `请输入模版内容否则将使用默认模版，模板变量同上`,
  //     required: false,
  //   })
  //   template!: string;

  @TaskInput({
    title: "备注",
    component: {
      name: "a-input",
      vModel: "value",
    },
    required: false,
  })
  remark!: string;

  async onInstance() {}
  async execute(): Promise<void> {
    this.logger.info(`开始发送邮件`);
    const certReader = new CertReader(this.cert);
    const mainDomain = certReader.getMainDomain();
    const domains = certReader.getAllDomains().join(",");

    const data: any = {
      mainDomain,
      domains,
      expiresTime: dayjs(certReader.expires).format("YYYY-MM-DD HH:mm:ss"),
      remark: this.remark || "",
      crt: this.cert.crt,
      key: this.cert.key,
      ic: this.cert.ic,
      url: "",
    };

    const title = `证书申请成功【${mainDomain}】`;
    const content = `证书申请成功
域名：${domains}
证书有效期：${data.expiresTime}
备注：${this.remark || ""}
      `;
    data.content = content;
    data.title = title;
    const file = this.certZip;
    if (!file) {
      throw new Error("证书压缩文件还未生成，重新运行证书任务");
    }
    await this.ctx.emailService.sendByTemplate({
      type: "sendCert",
      data,
      receivers: this.email,
      attachments: [
        {
          filename: file.filename,
          path: file.path,
        },
      ],
    });
  }

  compile(templateString: string) {
    return function (data) {
      return templateString.replace(/\${(.*?)}/g, (match, key) => {
        const value = get(data, key, "");
        return String(value);
      });
    };
  }
}
new DeployCertToMailPlugin();
