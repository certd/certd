import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput, TaskOutput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { JDCloudAccess } from "../access.js";

@IsTaskPlugin({
  name: "JDCloudUploadCert",
  title: "京东云-上传新证书",
  icon: "svg:icon-jdcloud",
  group: pluginGroups.jdcloud.key,
  desc: "上传证书到SSL数字证书中心",
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class JDCloudUploadCert extends AbstractTaskPlugin {
  @TaskInput({
    title: "域名证书",
    helper: "请选择前置任务输出的域名证书",
    component: {
      name: "output-selector",
      from: [...CertApplyPluginNames, "JDCloudUploadCert"],
    },
    required: true,
  })
  cert!: CertInfo | string;

  @TaskInput({
    title: "Access授权",
    helper: "京东云AccessKeyId、AccessKeySecret",
    component: {
      name: "access-selector",
      type: "jdcloud",
    },
    required: true,
  })
  accessId!: string;

  @TaskInput({
    title: "证书名称前缀",
    helper: "证书形成，默认为certd",
    required: false,
  })
  certName!: string;

  @TaskOutput({
    title: "上传成功后的京东云CertId",
  })
  jdcloudCertId!: number;

  async onInstance() {}

  async execute(): Promise<void> {
    this.logger.info("开始上传证书到京东云数字证书中心");
    const access = await this.getAccess<JDCloudAccess>(this.accessId);

    const service = await this.getClient(access);

    const certInfo = this.cert as CertInfo;
    const res = await access.catchCall(() =>
      service.uploadCert({
        /*
    @param {string} opts.certName - 证书名称
@param {string} opts.keyFile - 私钥
@param {string} opts.certFile - 证书
@param {string} [opts.aliasName] - 证书别名  optional
       */
        certName: this.appendTimeSuffix(this.certName || "certd"),
        certFile: certInfo.crt,
        keyFile: certInfo.key,
      })
    );
    this.jdcloudCertId = res.result.certId;
    this.logger.info(`上传证书成功:${JSON.stringify(res)}`);
  }

  async getClient(access: JDCloudAccess) {
    const { JDSslService } = await import("@certd/jdcloud");
    const service = new JDSslService({
      credentials: {
        accessKeyId: access.accessKeyId,
        secretAccessKey: access.secretAccessKey,
      },
      regionId: "cn-north-1", //地域信息，某个api调用可以单独传参regionId，如果不传则会使用此配置中的regionId
    });
    return service;
  }
}

new JDCloudUploadCert();
