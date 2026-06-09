import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertInfo } from "@certd/plugin-cert";
import { utils } from "@certd/basic";
import { ossClientFactory } from "../../plugin-lib/oss/factory.js";

@IsTaskPlugin({
  name: "UploadCertToOss",
  title: "上传证书到对象存储OSS",
  icon: "ion:cloud-upload-outline",
  desc: "支持阿里云OSS、腾讯云COS、七牛云KODO、S3、MinIO、FTP、SFTP",
  group: pluginGroups.host.key,
  showRunStrategy: false,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class UploadCertToOssPlugin extends AbstractTaskPlugin {
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
    title: "OSS类型",
    component: {
      name: "a-select",
      vModel: "value",
      options: [
        { label: "阿里云OSS", value: "alioss" },
        { label: "腾讯云COS", value: "tencentcos" },
        { label: "七牛OSS", value: "qiniuoss" },
        { label: "S3/Minio", value: "s3" },
        { label: "SFTP", value: "sftp" },
        { label: "FTP", value: "ftp" },
      ],
    },
    required: true,
  })
  uploaderType!: string;

  @TaskInput({
    title: "OSS授权",
    component: {
      name: "access-selector",
    },
    required: true,
    mergeScript: `
      return {
        component: {
        type: ctx.compute(({form})=>{
            return form.uploaderType;
          })
        }
      }
    `,
  })
  accessId!: string;

  @TaskInput({
    title: "证书格式",
    helper: "要部署的证书格式，支持pem、pfx、der、jks",
    component: {
      name: "a-select",
      options: [
        { value: "pem", label: "pem（crt），Nginx等大部分应用" },
        { value: "pfx", label: "pfx，一般用于IIS" },
        { value: "der", label: "der，一般用于Apache" },
        { value: "jks", label: "jks，一般用于JAVA应用" },
        { value: "one", label: "证书私钥一体，crt+key简单合并为一个pem文件" },
      ],
    },
    required: true,
  })
  certType!: string;

  @TaskInput({
    title: "证书保存路径",
    helper: "路径要包含证书文件名，例如：/tmp/cert.pem",
    component: {
      placeholder: "/root/deploy/nginx/full_chain.pem",
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
    helper: "路径要包含私钥文件名，例如：/tmp/cert.key",
    component: {
      placeholder: "/root/deploy/nginx/cert.key",
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
    helper: "路径要包含文件名，一般情况传上面两个文件即可，极少数情况需要这个中间证书",
    component: {
      placeholder: "/root/deploy/nginx/intermediate.pem",
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
    helper: "路径要包含证书文件名，例如：D:\\iis\\cert.pfx",
    component: {
      placeholder: "D:\\iis\\cert.pfx",
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
    helper: "路径要包含证书文件名，例如：/tmp/cert.der",
    component: {
      placeholder: "/root/deploy/apache/cert.der",
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
    helper: "路径要包含证书文件名，例如：/tmp/cert.jks",
    component: {
      placeholder: "/root/deploy/java_app/cert.jks",
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
    title: "一体证书保存路径",
    helper: "路径要包含证书文件名，例如：/tmp/crt_key.pem",
    component: {
      placeholder: "/app/crt_key.pem",
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

  async onInstance() {}
  async execute(): Promise<void> {
    const { accessId } = this;
    const { crtPath, keyPath, icPath, pfxPath, derPath, jksPath, onePath } = this;
    if (!accessId) {
      throw new Error("OSS授权配置不能为空");
    }

    const uploaderType = this.uploaderType;
    const uploaderAccess = this.accessId;

    const httpUploaderContext = {
      accessService: this.ctx.accessService,
      logger: this.logger,
      utils,
    };

    const access = await this.getAccess(uploaderAccess);
    this.logger.info("上传方式", uploaderType);
    const httpUploader = await ossClientFactory.createOssClientByType(uploaderType, {
      access,
      rootDir: "",
      ctx: httpUploaderContext,
    });

    this.logger.info("准备上传文件到OSS");

    if (crtPath) {
      await httpUploader.upload(crtPath, Buffer.from(this.cert.crt));
      this.logger.info(`上传证书：${crtPath}`);
    }
    if (keyPath) {
      await httpUploader.upload(keyPath, Buffer.from(this.cert.key));
      this.logger.info(`上传私钥：${keyPath}`);
    }
    if (icPath) {
      await httpUploader.upload(icPath, Buffer.from(this.cert.ic));
      this.logger.info(`上传中间证书：${icPath}`);
    }
    if (pfxPath) {
      await httpUploader.upload(pfxPath, Buffer.from(this.cert.pfx, "base64"));
      this.logger.info(`上传PFX证书：${pfxPath}`);
    }
    if (derPath) {
      await httpUploader.upload(derPath, Buffer.from(this.cert.der, "base64"));
      this.logger.info(`上传DER证书：${derPath}`);
    }
    if (this.jksPath) {
      await httpUploader.upload(jksPath, Buffer.from(this.cert.jks, "base64"));
      this.logger.info(`上传jks证书：${jksPath}`);
    }

    if (onePath) {
      await httpUploader.upload(onePath, Buffer.from(this.cert.one));
      this.logger.info(`上传一体证书：${onePath}`);
    }

    this.logger.info("上传文件成功");
  }
}
new UploadCertToOssPlugin();
