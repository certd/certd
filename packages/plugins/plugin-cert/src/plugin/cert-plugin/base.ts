import { AbstractTaskPlugin, HttpClient, IContext, Step, TaskInput, TaskOutput } from "@certd/pipeline";
import dayjs from "dayjs";
import type { CertInfo } from "./acme.js";
import { CertReader } from "./cert-reader.js";
import JSZip from "jszip";

export { CertReader };
export type { CertInfo };

export abstract class CertApplyBasePlugin extends AbstractTaskPlugin {
  @TaskInput({
    title: "域名",
    component: {
      name: "a-select",
      vModel: "value",
      mode: "tags",
      open: false,
    },
    required: true,
    col: {
      span: 24,
    },
    order: -1,
    helper:
      "1、支持通配符域名，例如： *.foo.com、foo.com、*.test.handsfree.work\n" +
      "2、支持多个域名、多个子域名、多个通配符域名打到一个证书上（域名必须是在同一个DNS提供商解析）\n" +
      "3、多级子域名要分成多个域名输入（*.foo.com的证书不能用于xxx.yyy.foo.com、foo.com）\n" +
      "4、输入一个回车之后，再输入下一个",
  })
  domains!: string[];

  @TaskInput({
    title: "邮箱",
    component: {
      name: "a-input",
      vModel: "value",
    },
    required: true,
    order: -1,
    helper: "请输入邮箱",
  })
  email!: string;

  @TaskInput({
    title: "更新天数",
    value: 20,
    component: {
      name: "a-input-number",
      vModel: "value",
    },
    required: true,
    order: 100,
    helper: "到期前多少天后更新证书，注意：流水线默认不会自动运行，请设置定时器，每天定时运行本流水线",
  })
  renewDays!: number;

  @TaskInput({
    title: "强制更新",
    component: {
      name: "a-switch",
      vModel: "checked",
    },
    order: 100,
    helper: "是否强制重新申请证书",
  })
  forceUpdate!: string;

  @TaskInput({
    title: "成功后邮件通知",
    value: true,
    component: {
      name: "a-switch",
      vModel: "checked",
    },
    order: 100,
    helper: "申请成功后是否发送邮件通知",
  })
  successNotify = true;

  @TaskInput({
    title: "配置说明",
    order: 9999,
    helper: "运行策略请选择总是运行，其他证书部署任务请选择成功后跳过；当证书快到期前将会自动重新申请证书，然后会清空后续任务的成功状态，部署任务将会重新运行",
  })
  intro!: string;

  // @TaskInput({
  //   title: "CsrInfo",
  //   helper: "暂时没有用",
  // })
  csrInfo!: string;

  userContext!: IContext;
  http!: HttpClient;
  lastStatus!: Step;

  @TaskOutput({
    title: "域名证书",
  })
  cert?: CertInfo;

  async onInstance() {
    this.userContext = this.ctx.userContext;
    this.http = this.ctx.http;
    this.lastStatus = this.ctx.lastStatus as Step;
    await this.onInit();
  }

  abstract onInit(): Promise<void>;

  abstract doCertApply(): Promise<any>;

  async execute(): Promise<void> {
    const oldCert = await this.condition();
    if (oldCert != null) {
      return await this.output(oldCert, false);
    }
    const cert = await this.doCertApply();
    if (cert != null) {
      await this.output(cert, true);
      //清空后续任务的状态，让后续任务能够重新执行
      this.clearLastStatus();

      if (this.successNotify) {
        await this.sendSuccessEmail();
      }
    } else {
      throw new Error("申请证书失败");
    }
  }

  async output(certReader: CertReader, isNew: boolean) {
    const cert: CertInfo = certReader.toCertInfo();
    this.cert = cert;

    this._result.pipelineVars.certExpiresTime = dayjs(certReader.detail.notAfter).valueOf();

    if (isNew) {
      const applyTime = dayjs(certReader.detail.notBefore).format("YYYYMMDD_HHmmss");
      await this.zipCert(cert, applyTime);
    } else {
      this.extendsFiles();
    }
    // thi
    // s.logger.info(JSON.stringify(certReader.detail));
  }

  async zipCert(cert: CertInfo, applyTime: string) {
    const zip = new JSZip();
    zip.file("cert.crt", cert.crt);
    zip.file("cert.key", cert.key);
    const domain_name = this.domains[0].replace(".", "_").replace("*", "_");
    const filename = `cert_${domain_name}_${applyTime}.zip`;
    const content = await zip.generateAsync({ type: "nodebuffer" });
    this.saveFile(filename, content);
    this.logger.info(`已保存文件:${filename}`);
  }

  /**
   * 是否更新证书
   */
  async condition() {
    if (this.forceUpdate) {
      return null;
    }

    let inputChanged = false;
    const oldInput = JSON.stringify(this.lastStatus?.input?.domains);
    const thisInput = JSON.stringify(this.domains);
    if (oldInput !== thisInput) {
      inputChanged = true;
    }

    let oldCert: CertReader | undefined = undefined;
    try {
      oldCert = await this.readLastCert();
    } catch (e) {
      this.logger.warn("读取cert失败：", e);
    }
    if (oldCert == null) {
      this.logger.info("还未申请过，准备申请新证书");
      return null;
    }

    if (inputChanged) {
      this.logger.info("输入参数变更，申请新证书");
      return null;
    }

    const ret = this.isWillExpire(oldCert.expires, this.renewDays);
    if (!ret.isWillExpire) {
      this.logger.info(`证书还未过期：过期时间${dayjs(oldCert.expires).format("YYYY-MM-DD HH:mm:ss")},剩余${ret.leftDays}天`);
      return oldCert;
    }
    this.logger.info("即将过期，开始更新证书");
    return null;
  }

  formatCert(pem: string) {
    pem = pem.replace(/\r/g, "");
    pem = pem.replace(/\n\n/g, "\n");
    pem = pem.replace(/\n$/g, "");
    return pem;
  }

  formatCerts(cert: { crt: string; key: string; csr: string }) {
    const newCert: CertInfo = {
      crt: this.formatCert(cert.crt),
      key: this.formatCert(cert.key),
      csr: this.formatCert(cert.csr),
    };
    return newCert;
  }

  async readLastCert(): Promise<CertReader | undefined> {
    const cert = this.lastStatus?.status?.output?.cert;
    if (cert == null) {
      return undefined;
    }
    return new CertReader(cert);
  }

  /**
   * 检查是否过期，默认提前20天
   * @param expires
   * @param maxDays
   * @returns {boolean}
   */
  isWillExpire(expires: number, maxDays = 20) {
    if (expires == null) {
      throw new Error("过期时间不能为空");
    }
    // 检查有效期
    const leftDays = dayjs(expires).diff(dayjs(), "day");
    return {
      isWillExpire: leftDays < maxDays,
      leftDays,
    };
  }

  private async sendSuccessEmail() {
    try {
      this.logger.info("发送成功邮件通知:" + this.email);
      const subject = `【CertD】证书申请成功【${this.domains[0]}】`;
      await this.ctx.emailService.send({
        userId: this.ctx.pipeline.userId,
        receivers: [this.email],
        subject: subject,
        content: `证书申请成功，域名：${this.domains.join(",")}`,
      });
    } catch (e) {
      this.logger.error("send email error", e);
    }
  }
}
