import { utils } from "@certd/basic";
import { IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo, CertReader } from "@certd/plugin-cert";
import dayjs from "dayjs";
import { get } from "lodash-es";
import { K8sAccess } from "../access.js";
import { AbstractPlusTaskPlugin } from "@certd/plugin-lib";
@IsTaskPlugin({
  name: "K8sApply",
  title: "K8S-Apply自定义yaml",
  icon: "mdi:kubernetes",
  desc: "apply自定义yaml到k8s",
  needPlus: true,
  group: pluginGroups.panel.key,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class K8sApplyPlugin extends AbstractPlusTaskPlugin {
  @TaskInput({
    title: "域名证书",
    helper: "请选择前置任务输出的域名证书",
    component: {
      name: "output-selector",
      from: [...CertApplyPluginNames],
    },
    required: true,
  })
  cert!: CertInfo;

  @TaskInput({
    title: "前置任务输出",
    helper: "请选择前置任务输出的内容",
    component: {
      name: "output-selector",
      from: ["::"],
    },
    required: false,
  })
  preOutput!: any;

  @TaskInput({
    title: "k8s授权",
    helper: "kubeconfig",
    component: {
      name: "access-selector",
      type: "k8s",
    },
    required: true,
  })
  accessId!: string;

  // @TaskInput({
  //   title: "命名空间",
  //   value: "default",
  //   component: {
  //     placeholder: "命名空间",
  //   },
  //   required: true,
  // })
  // namespace!: string;

  @TaskInput({
    title: "yaml",
    required: true,
    helper: "apply yaml，模板变量：主域名=${mainDomain}、全部域名=${domains}、过期时间=${expiresTime}、证书PEM=${crt}、证书私钥=${key}、中间证书/CA证书=${ic}、前置任务输出=${preOutput}",
    component: {
      name: "a-textarea",
      vModel: "value",
      rows: 6,
    },
  })
  yamlContent!: string;

  K8sClient: any;
  async onInstance() {
    const sdk = await import("@certd/lib-k8s");
    this.K8sClient = sdk.K8sClient;
  }
  async execute(): Promise<void> {
    const access: K8sAccess = await this.getAccess(this.accessId);
    const client = new this.K8sClient({
      kubeConfigStr: access.kubeconfig,
      logger: this.logger,
      skipTLSVerify: access.skipTLSVerify,
    });
    if (!this.yamlContent) {
      throw new Error("yamlContent is empty");
    }

    const certReader = new CertReader(this.cert);
    const mainDomain = certReader.getMainDomain();
    const domains = certReader.getAllDomains().join(",");

    const data = {
      mainDomain,
      domains,
      expiresTime: dayjs(certReader.expires).format("YYYY-MM-DD HH:mm:ss"),
      crt: this.cert.crt,
      key: this.cert.key,
      ic: this.cert.ic,
      preOutput: this.preOutput,
    };

    const compile = this.compile(this.yamlContent);
    const compiledYaml = compile(data);
    // 解析 YAML 内容（可能包含多个文档）
    // const yamlDocs = yaml.loadAll(compiledYaml);

    try {
      // this.logger.info("apply yaml:", compiledYaml);
      // this.logger.info("apply yamlDoc:", JSON.stringify(doc));
      const res = await client.apply(compiledYaml);
      this.logger.info("apply result:", res);
    } catch (e) {
      if (e.response?.body) {
        throw new Error(JSON.stringify(e.response.body));
      }
      throw e;
    }
    await utils.sleep(5000); // 停留2秒，等待secret部署完成
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
new K8sApplyPlugin();
