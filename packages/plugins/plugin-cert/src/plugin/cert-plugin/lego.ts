import { IsTaskPlugin, RunStrategy, sp, Step, TaskInput } from "@certd/pipeline";
import type { CertInfo } from "./acme.js";
import { CertReader } from "./cert-reader.js";
import { CertApplyBasePlugin } from "./base.js";
import fs from "fs";
import { EabAccess } from "../../access";
import path from "path";

export { CertReader };
export type { CertInfo };

@IsTaskPlugin({
  name: "CertApplyLego",
  title: "证书申请（Lego）",
  desc: "支持海量DNS解析提供商，推荐使用",
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
  @TaskInput({
    title: "DNS类型",
    component: {
      name: "a-input",
      vModel: "value",
    },
    required: true,
  })
  dnsType!: string;

  @TaskInput({
    title: "环境变量",
    component: {
      name: "a-textarea",
      vModel: "value",
      rows: 6,
    },
    required: true,
    helper: "一行一条，例如 appKeyId=xxxxx",
  })
  environment!: string;

  @TaskInput({
    title: "EAB授权",
    component: {
      name: "pi-access-selector",
      type: "eab",
    },
    helper: "如果需要提供EAB授权",
  })
  eabAccessId!: number;

  @TaskInput({
    title: "自定义LEGO参数",
    component: {
      name: "a-input",
      vModel: "value",
    },
  })
  customArgs = "";

  eab?: EabAccess;

  async onInstance() {
    this.accessService = this.ctx.accessService;
    this.logger = this.ctx.logger;
    this.userContext = this.ctx.userContext;
    this.http = this.ctx.http;
    this.lastStatus = this.ctx.lastStatus as Step;
    if (this.eabAccessId) {
      this.eab = await this.ctx.accessService.getById(this.eabAccessId);
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
    const cmds = [
      `${legoPath} -a --email "${this.email}" --dns ${this.dnsType} ${keyType} ${domainArgs} ${eabArgs} ${savePathArgs}  ${this.customArgs || ""} run`,
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
