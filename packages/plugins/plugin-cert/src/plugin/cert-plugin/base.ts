import { AbstractTaskPlugin, HttpClient, IContext, Step, TaskInput, TaskOutput } from "@certd/pipeline";
import dayjs from "dayjs";
import type { CertInfo } from "./acme.js";
import { CertReader } from "./cert-reader.js";
import JSZip from "jszip";
import { CertConverter } from "./convert.js";
import fs from "fs";
import { pick } from "lodash-es";

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
      tokenSeparators: [",", " ", "，", "、", "|"],
    },
    rules: [{ type: "domains" }],
    required: true,
    col: {
      span: 24,
    },
    order: -999,
    helper:
      "1、支持通配符域名，例如： *.foo.com、foo.com、*.test.handsfree.work\n" +
      "2、支持多个域名、多个子域名、多个通配符域名打到一个证书上（域名必须是在同一个DNS提供商解析）\n" +
      "3、多级子域名要分成多个域名输入（*.foo.com的证书不能用于xxx.yyy.foo.com、foo.com）\n" +
      "4、输入一个，空格之后，再输入下一个",
  })
  domains!: string[];

  @TaskInput({
    title: "邮箱",
    component: {
      name: "a-input",
      vModel: "value",
    },
    rules: [{ type: "email" }],
    required: true,
    order: -1,
    helper: "请输入邮箱",
  })
  email!: string;

  @TaskInput({
    title: "PFX证书密码",
    component: {
      name: "a-input-password",
      vModel: "value",
    },
    required: false,
    order: 100,
    helper: "PFX格式证书是否需要加密",
  })
  pfxPassword!: string;

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
    if (!this._result.pipelinePrivateVars) {
      this._result.pipelinePrivateVars = {};
    }
    this._result.pipelinePrivateVars.cert = cert;

    if (cert.pfx == null || cert.der == null) {
      try {
        const converter = new CertConverter({ logger: this.logger });
        const res = await converter.convert({
          cert,
          pfxPassword: this.pfxPassword,
        });
        const pfxBuffer = fs.readFileSync(res.pfxPath);
        cert.pfx = pfxBuffer.toString("base64");

        const derBuffer = fs.readFileSync(res.derPath);
        cert.der = derBuffer.toString("base64");

        this.logger.info("转换证书格式成功");
        isNew = true;
      } catch (e) {
        this.logger.error("转换证书格式失败", e);
      }
    }

    if (isNew) {
      const zipFileName = certReader.buildCertFileName("zip", certReader.detail.notBefore);
      await this.zipCert(cert, zipFileName);
    } else {
      this.extendsFiles();
    }
  }

  async zipCert(cert: CertInfo, filename: string) {
    const zip = new JSZip();
    zip.file("证书.pem", cert.crt);
    zip.file("私钥.pem", cert.key);
    zip.file("中间证书.pem", cert.ic);
    zip.file("cert.crt", cert.crt);
    zip.file("cert.key", cert.key);
    zip.file("intermediate.crt", cert.ic);
    if (cert.pfx) {
      zip.file("cert.pfx", Buffer.from(cert.pfx, "base64"));
    }
    if (cert.der) {
      zip.file("cert.der", Buffer.from(cert.der, "base64"));
    }
    const content = await zip.generateAsync({ type: "nodebuffer" });
    this.saveFile(filename, content);
    this.logger.info(`已保存文件:${filename}`);
  }

  /**
   * 是否更新证书
   */
  async condition() {
    if (this.forceUpdate) {
      this.logger.info("强制更新证书选项已勾选，准备申请新证书");
      this.logger.warn("申请完之后，切记取消强制更新，避免申请过多证书。");
      return null;
    }

    let inputChanged = this.ctx.inputChanged;
    if (inputChanged) {
      this.logger.info("input hash 有变更，检查是否需要重新申请证书");
      //判断域名有没有变更
      /**
       *                      "renewDays": 20,
       *                     "certApplyPlugin": "CertApply",
       *                     "sslProvider": "letsencrypt",
       *                     "privateKeyType": "rsa_2048_pkcs1",
       *                     "dnsProviderType": "aliyun",
       *                     "domains": [
       *                       "*.handsfree.work"
       *                     ],
       *                     "email": "xiaojunnuo@qq.com",
       *                     "dnsProviderAccess": 3,
       *                     "useProxy": false,
       *                     "skipLocalVerify": false,
       *                     "successNotify": true,
       *                     "pfxPassword": "123456"
       */
      const checkInputChanges = ["domains", "sslProvider", "privateKeyType", "dnsProviderType", "dnsProviderAccess", "pfxPassword"];
      const oldInput = JSON.stringify(pick(this.lastStatus?.input, checkInputChanges));
      const thisInput = JSON.stringify(pick(this, checkInputChanges));
      inputChanged = oldInput !== thisInput;

      if (inputChanged) {
        this.logger.info("输入参数变更，准备申请新证书");
        return null;
      }
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
