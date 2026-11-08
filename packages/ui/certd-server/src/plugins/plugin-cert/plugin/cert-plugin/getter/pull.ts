import { IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertReader } from "@certd/plugin-lib";
import { createPrivateKey, X509Certificate } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ossClientFactory } from "../../../../plugin-lib/oss/factory.js";
import { OssClientContext } from "../../../../plugin-lib/oss/api.js";
import { CertApplyBaseConvertPlugin } from "../base-convert.js";

@IsTaskPlugin({
  name: "CertApplyPull",
  icon: "ph:certificate",
  title: "证书拉取托管",
  group: pluginGroups.cert.key,
  desc: "从 HTTP/HTTPS、OSS、S3/MinIO、SFTP、FTP 拉取证书，证书更新后自动部署",
  default: {
    strategy: {
      runStrategy: RunStrategy.AlwaysRun,
    },
  },
  i18n: {
    "en-US": {
      title: "Pull and Manage Certificate",
      desc: "Pull certificates from HTTP/HTTPS, OSS, S3/MinIO, SFTP or FTP and deploy them when updated.",
      input: {
        sourceType: { title: "Certificate Source", component: { optionsMapping: { http: "HTTP/HTTPS", alioss: "Alibaba Cloud OSS", tencentcos: "Tencent COS", qiniuoss: "Qiniu KODO" } } },
        accessId: { title: "Source Credentials", helper: "HTTP/HTTPS credentials are optional; without them, use complete file URLs." },
        crtPath: {
          title: "Certificate Path",
          helper:
            "PEM full chain file. HTTP/HTTPS accepts a path relative to the credentials URL or a complete URL from the same origin; without credentials, use a complete URL. Other sources accept a file path or object key.",
        },
        keyPath: {
          title: "Private Key Path",
          helper:
            "PEM private key file. HTTP/HTTPS accepts a path relative to the credentials URL or a complete URL from the same origin; without credentials, use a complete URL. Other sources accept a file path or object key.",
        },
        domains: { title: "Certificate Domains", helper: "Enter the domains covered by this certificate." },
      },
      output: { cert: { title: "Domain Certificate" } },
    },
  },
})
export class CertApplyPull extends CertApplyBaseConvertPlugin {
  @TaskInput({
    title: "证书来源",
    value: "http",
    component: {
      name: "a-select",
      vModel: "value",
      options: [
        { label: "HTTP/HTTPS", value: "http" },
        { label: "阿里云OSS", value: "alioss" },
        { label: "腾讯云COS", value: "tencentcos" },
        { label: "七牛云KODO", value: "qiniuoss" },
        { label: "S3/MinIO", value: "s3" },
        { label: "SFTP", value: "sftp" },
        { label: "FTP", value: "ftp" },
      ],
    },
    required: true,
  })
  sourceType = "http";

  @TaskInput({
    title: "来源授权",
    component: {
      name: "access-selector",
    },
    required: false,
    helper: "选择对应来源的授权。HTTP/HTTPS 授权可配置 URL、method、headers 和 body，不选授权时直接使用完整文件 URL",
    mergeScript: `
      return {
        required: ctx.compute(({form}) => form.sourceType !== 'http'),
        component: {
          type: ctx.compute(({form}) => form.sourceType)
        }
      }
    `,
  })
  accessId!: string;

  @TaskInput({
    title: "证书路径",
    component: {
      name: "a-input",
      vModel: "value",
    },
    required: true,
    helper: "PEM 格式的完整证书链文件。HTTP/HTTPS 可填相对授权 URL 的路径或同源完整 URL，不选授权时须填完整 URL；其他来源填文件路径或对象 key，需包含文件名",
  })
  crtPath!: string;

  @TaskInput({
    title: "私钥路径",
    component: {
      name: "a-input",
      vModel: "value",
    },
    required: true,
    helper: "PEM 格式私钥文件。HTTP/HTTPS 可填相对授权 URL 的路径或同源完整 URL，不选授权时须填完整 URL；其他来源填文件路径或对象 key，需包含文件名",
  })
  keyPath!: string;

  @TaskInput({
    title: "到期前拉取天数",
    value: 20,
    component: {
      name: "a-input-number",
      vModel: "value",
    },
    required: true,
    order: 100,
    helper: "到期前多少天拉取证书",
  })
  renewDays!: number;

  async onInit(): Promise<void> {}

  async execute(): Promise<string | void> {
    if (!["http", "alioss", "tencentcos", "qiniuoss", "s3", "sftp", "ftp"].includes(this.sourceType)) {
      throw new Error("请选择支持的证书来源");
    }
    if (!this.crtPath?.trim() || !this.keyPath?.trim()) {
      throw new Error("证书路径和私钥路径不能为空");
    }

    let access = null;
    if (this.accessId) {
      access = await this.getAccess(this.accessId);
    } else if (this.sourceType !== "http") {
      throw new Error("请选择来源授权");
    }
    if (this.sourceType === "http") {
      // URL 中可能包含签名或认证信息，避免出现在请求错误日志中。
      this.registerSecret(this.crtPath);
      this.registerSecret(this.keyPath);
    }

    const ctx: OssClientContext = {
      accessService: this.accessService,
      logger: this.logger,
      utils: this.ctx.utils,
      http: this.http,
    };
    const client = await ossClientFactory.createOssClientByType(this.sourceType, { access, ctx });
    this.logger.info("开始拉取证书，来源：", this.sourceType);

    // 每次执行独享临时目录，远程路径不能影响本地文件位置。
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "certd-cert-pull-"));
    let certReader: CertReader;
    try {
      this.checkSignal();
      const crtFile = path.join(tempDir, "fullchain.pem");
      const keyFile = path.join(tempDir, "privkey.pem");
      await client.download(this.crtPath, crtFile);
      this.checkSignal();
      await client.download(this.keyPath, keyFile);
      this.checkSignal();
      const crt = await fs.readFile(crtFile, "utf8");
      const key = await fs.readFile(keyFile, "utf8");
      if (!crt.trim() || !key.trim()) {
        throw new Error("拉取的证书或私钥文件为空");
      }
      this.registerSecret(crt);
      this.registerSecret(key);
      certReader = new CertReader({ crt: this.formatCert(crt), key: this.formatCert(key) });
      const privateKey = createPrivateKey(certReader.cert.key);
      const certificate = new X509Certificate(certReader.cert.crt);
      if (!certificate.checkPrivateKey(privateKey)) {
        throw new Error("拉取的证书与私钥不匹配，停止部署");
      }
      if (certReader.expires <= Date.now()) {
        throw new Error("拉取的证书已过期，停止部署，请更新来源证书");
      }
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }

    let oldCertReader: CertReader;
    try {
      oldCertReader = await this.readLastCert();
    } catch (e) {
      this.logger.warn("上次证书解析失败，将使用本次拉取的证书");
    }
    if (oldCertReader && !this.ctx.inputChanged) {
      const sameCert = this.formatCert(oldCertReader.cert.crt) === certReader.cert.crt;
      const sameKey = this.formatCert(oldCertReader.cert.key) === certReader.cert.key;
      if (sameCert && sameKey) {
        this.logger.info("证书无变化，跳过重新部署");
        // 主动 skip 仍需输出，供后续任务和下次运行复用。
        await this.output(oldCertReader, false);
        return "skip";
      }
    }

    this.clearLastStatus();
    await this.output(certReader, true);
    await this.emitCertApplySuccess();
    this.logger.info("证书拉取完成，已输出供后续部署任务使用");
  }
}

new CertApplyPull();
