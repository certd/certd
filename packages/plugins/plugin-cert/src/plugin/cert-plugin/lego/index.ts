import { IsTaskPlugin, pluginGroups, RunStrategy, sp, Step, TaskInput } from "@certd/pipeline";
import type { CertInfo } from "../acme.js";
import { CertReader } from "../cert-reader.js";
import { CertApplyBasePlugin } from "../base.js";
import fs from "fs";
import { EabAccess } from "../../../access/index.js";
import path from "path";

export { CertReader };
export type { CertInfo };

@IsTaskPlugin({
  name: "CertApplyLego",
  title: "证书申请（Lego）",
  group: pluginGroups.cert.key,
  desc: "支持海量DNS解析提供商，推荐使用，一样的免费通配符域名证书申请，支持多个域名打到同一个证书上",
  default: {
    input: {
      renewDays: 20,
      forceUpdate: false,
    },
    strategy: {
      runStrategy: RunStrategy.AlwaysRun,
    },
  },
})
export class CertApplyLegoPlugin extends CertApplyBasePlugin {
  // @TaskInput({
  //   title: "ACME服务端点",
  //   default: "https://acme-v02.api.letsencrypt.org/directory",
  //   component: {
  //     name: "a-select",
  //     vModel: "value",
  //     options: [
  //       { value: "https://acme-v02.api.letsencrypt.org/directory", label: "Let's Encrypt" },
  //       { value: "https://letsencrypt.proxy.handsfree.work/directory", label: "Let's Encrypt代理，letsencrypt.org无法访问时使用" },
  //     ],
  //   },
  //   required: true,
  // })
  acmeServer!: string;

  @TaskInput({
    title: "DNS类型",
    component: {
      name: "a-input",
      vModel: "value",
      placeholder: "alidns",
    },
    helper: "你的域名是通过哪家提供商进行解析的，具体应该配置什么请参考lego文档：https://go-acme.github.io/lego/dns/",
    required: true,
  })
  dnsType!: string;

  @TaskInput({
    title: "环境变量",
    component: {
      name: "a-textarea",
      vModel: "value",
      rows: 4,
      placeholder: "ALICLOUD_ACCESS_KEY=abcdefghijklmnopqrstuvwx\nALICLOUD_SECRET_KEY=your-secret-key",
    },
    required: true,
    helper: "一行一条，例如 appKeyId=xxxxx，具体配置请参考lego文档：https://go-acme.github.io/lego/dns/",
  })
  environment!: string;

  @TaskInput({
    title: "EAB授权",
    component: {
      name: "pi-access-selector",
      type: "eab",
    },
    maybeNeed: true,
    helper: "如果需要提供EAB授权",
  })
  legoEabAccessId!: number;

  @TaskInput({
    title: "自定义LEGO参数",
    component: {
      name: "a-input",
      vModel: "value",
      placeholder: "--dns-timeout 30",
    },
    helper: "额外的lego命令行参数，参考文档：https://go-acme.github.io/lego/usage/cli/options/",
    maybeNeed: true,
  })
  customArgs = "";

  eab?: EabAccess;

  async onInstance() {
    this.accessService = this.ctx.accessService;
    this.logger = this.ctx.logger;
    this.userContext = this.ctx.userContext;
    this.http = this.ctx.http;
    this.lastStatus = this.ctx.lastStatus as Step;
    if (this.legoEabAccessId) {
      this.eab = await this.accessService.getById(this.legoEabAccessId);
    }
  }
  async onInit(): Promise<void> {}

  async doCertApply() {
    const env: any = {};
    const env_lines = this.environment.split("\n");
    for (const line of env_lines) {
      const [key, value] = line.trim().split("=");
      env[key] = value.trim();
    }

    let domainArgs = "";
    for (const domain of this.domains) {
      domainArgs += ` -d "${domain}"`;
    }
    this.logger.info(`环境变量:${JSON.stringify(env)}`);
    let eabArgs = "";
    if (this.eab) {
      eabArgs = ` --eab "${this.eab.kid}" --kid "${this.eab.kid}" --hmac "${this.eab.hmacKey}"`;
    }
    const keyType = "-k rsa2048";

    const saveDir = `./data/.lego/pipeline_${this.pipeline.id}/`;
    const savePathArgs = `--path "${saveDir}"`;
    const os_type = process.platform === "win32" ? "windows" : "linux";
    const legoPath = path.resolve("./tools", os_type, "lego");
    let serverArgs = "";
    if (this.acmeServer) {
      serverArgs = ` --server ${this.acmeServer}`;
    }
    const cmds = [
      `${legoPath} -a --email "${this.email}" --dns ${this.dnsType} ${keyType} ${domainArgs} ${serverArgs} ${eabArgs} ${savePathArgs}  ${
        this.customArgs || ""
      } run`,
    ];

    await sp.spawn({
      cmd: cmds,
      logger: this.logger,
      env,
    });

    //读取证书文件
    // example.com.crt
    // example.com.issuer.crt
    // example.com.json
    // example.com.key

    let domain1 = this.domains[0];
    domain1 = domain1.replaceAll("*", "_");
    const crtPath = path.resolve(saveDir, "certificates", `${domain1}.crt`);
    if (fs.existsSync(crtPath) === false) {
      throw new Error(`证书文件不存在,证书申请失败:${crtPath}`);
    }
    const crt = fs.readFileSync(crtPath, "utf8");
    const keyPath = path.resolve(saveDir, "certificates", `${domain1}.key`);
    const key = fs.readFileSync(keyPath, "utf8");
    const csr = "";
    const cert = { crt, key, csr };
    const certInfo = this.formatCerts(cert);
    return new CertReader(certInfo);
  }
}

new CertApplyLegoPlugin();
