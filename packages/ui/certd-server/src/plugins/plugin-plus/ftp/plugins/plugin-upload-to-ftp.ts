import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo, CertReader } from "@certd/plugin-cert";
import { FtpAccess } from "../../../plugin-lib/ftp/access.js";
import { FtpClient } from "../../../plugin-lib/ftp/client.js";

@IsTaskPlugin({
  name: "UploadCertToFTP",
  title: "FTP-上传证书到FTP",
  icon: "mdi:folder-upload-outline",
  group: pluginGroups.host.key,
  desc: "将证书上传到FTP服务器",
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
  needPlus: false,
})
export class UploadCertToFTPPlugin extends AbstractTaskPlugin {
  @TaskInput({
    title: "证书格式",
    helper: "要部署的证书格式，支持pem、pfx、der、jks",
    component: {
      name: "a-select",
      options: [
        { value: "pem", label: "pem，Nginx等大部分应用" },
        { value: "pfx", label: "pfx，一般用于IIS" },
        { value: "der", label: "der，一般用于Apache" },
        { value: "jks", label: "jks，一般用于JAVA应用" },
        { value: "one", label: "一体化证书，证书和私钥合并为一个pem文件" },
      ],
    },
    required: true,
  })
  certType!: string;

  @TaskInput({
    title: "PEM证书保存路径",
    helper: "需要有写入权限，路径要包含文件名",
    component: {
      placeholder: "/test/fullchain.pem",
    },
    mergeScript: `
      return {
        show: ctx.compute(({form})=>{
          return form.certType === 'pem';
        })
      }
    `,
    required: true,
    rules: [{ type: "filepath" }],
  })
  crtPath!: string;

  @TaskInput({
    title: "私钥保存路径",
    helper: "需要有写入权限，路径要包含文件名",
    component: {
      placeholder: "/test/privatekey.pem",
    },
    mergeScript: `
      return {
        show: ctx.compute(({form})=>{
          return form.certType === 'pem';
        })
      }
    `,
    required: true,
    rules: [{ type: "filepath" }],
  })
  keyPath!: string;

  @TaskInput({
    title: "中间证书保存路径",
    helper: "需要有写入权限，路径要包含文件名",
    component: {
      placeholder: "/test/immediate.pem",
    },
    mergeScript: `
      return {
        show: ctx.compute(({form})=>{
          return form.certType === 'pem';
        })
      }
    `,
    rules: [{ type: "filepath" }],
  })
  icPath!: string;

  @TaskInput({
    title: "PFX证书保存路径",
    helper: "需要有写入权限，路径要包含文件名",
    component: {
      placeholder: "/test/cert.pfx",
    },
    mergeScript: `
      return {
        show: ctx.compute(({form})=>{
          return form.certType === 'pfx';
        })
      }
    `,
    required: true,
    rules: [{ type: "filepath" }],
  })
  pfxPath!: string;

  @TaskInput({
    title: "DER证书保存路径",
    helper: "需要有写入权限，路径要包含文件名\n.der和.cer是相同的东西，改个后缀名即可",
    component: {
      placeholder: "/test/cert.der 或 /test/cert.cer",
    },
    mergeScript: `
      return {
        show: ctx.compute(({form})=>{
          return form.certType === 'der';
        })
      }
    `,
    required: true,
    rules: [{ type: "filepath" }],
  })
  derPath!: string;

  @TaskInput({
    title: "jks证书保存路径",
    helper: "证书原本的保存路径，路径要包含文件名",
    component: {
      placeholder: "/test/javaapp/cert.jks",
    },
    mergeScript: `
      return {
        show: ctx.compute(({form})=>{
          return form.certType === 'jks';
        })
      }
    `,
    required: true,
    rules: [{ type: "filepath" }],
  })
  jksPath!: string;

  @TaskInput({
    title: "一体化证书保存路径",
    helper: "证书原本的保存路径，路径要包含文件名",
    component: {
      placeholder: "/app/ssl/one.pem",
    },
    mergeScript: `
      return {
        show: ctx.compute(({form})=>{
          return form.certType === 'one';
        })
      }
    `,
    required: true,
    rules: [{ type: "filepath" }],
  })
  onePath!: string;

  //证书选择，此项必须要有
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

  //授权选择框
  @TaskInput({
    title: "FTP授权",
    component: {
      name: "access-selector",
      type: "ftp",
    },
    required: true,
  })
  accessId!: string;

  async onInstance() {}
  async execute(): Promise<void> {
    const { cert, accessId } = this;
    const access = await this.getAccess<FtpAccess>(accessId);
    const client = new FtpClient({
      access,
      logger: this.logger,
    });
    await client.connect(async () => {
      const certReader = new CertReader(cert);
      const handle = async ({ reader, tmpCrtPath, tmpKeyPath, tmpDerPath, tmpPfxPath, tmpIcPath, tmpJksPath, tmpOnePath }) => {
        try {
          await client.upload(tmpCrtPath, this.crtPath);
          await client.upload(tmpKeyPath, this.keyPath);
          await client.upload(tmpIcPath, this.icPath);
          await client.upload(tmpPfxPath, this.pfxPath);
          await client.upload(tmpDerPath, this.derPath);
          await client.upload(tmpJksPath, this.jksPath);
          await client.upload(tmpOnePath, this.onePath);
        } catch (e) {
          this.logger.error("请确认路径是否包含文件名，路径本身不能是目录，路径不能有*?之类的特殊符号，要有写入权限");
          throw e;
        }
      };
      await certReader.readCertFile({ logger: this.logger, handle });
    });

    this.logger.info("执行完成");
  }
}
new UploadCertToFTPPlugin();
