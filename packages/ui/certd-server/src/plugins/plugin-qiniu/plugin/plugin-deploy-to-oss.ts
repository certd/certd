import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { QiniuAccess, QiniuClient } from "../../plugin-lib/qiniu/index.js";

@IsTaskPlugin({
  name: "QiniuDeployCertToOSS",
  title: "七牛云-部署证书至OSS",
  icon: "svg:icon-qiniuyun",
  group: pluginGroups.qiniu.key,
  desc: "自动部署域名证书至七牛云KODO，注意是自定义源站域名，不是CDN域名",
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class QiniuDeployCertToOSS extends AbstractTaskPlugin {
  @TaskInput({
    title: "自定义源站域名",
    helper: "你在七牛云上配置的OSS域名，比如:certd.handsfree.work",
    required: true,
  })
  domainName!: string;

  @TaskInput({
    title: "域名证书",
    helper: "请选择前置任务输出的域名证书，或者上传到七牛云的证书id",
    component: {
      name: "output-selector",
      from: [...CertApplyPluginNames, "QiniuCertUpload"],
    },
    required: true,
  })
  cert!: CertInfo | string;

  @TaskInput({
    title: "Access授权",
    helper: "七牛云授权",
    component: {
      name: "access-selector",
      type: "qiniu",
    },
    required: true,
  })
  accessId!: string;

  async onInstance() {}
  async execute(): Promise<void> {
    this.logger.info("开始部署证书到七牛云oss");
    const access = await this.getAccess<QiniuAccess>(this.accessId);
    const qiniuClient = new QiniuClient({
      http: this.ctx.http,
      access,
      logger: this.logger,
    });

    let certId = null;
    if (typeof this.cert !== "string") {
      // 是证书id，直接上传即可
      this.logger.info("先上传证书");
      certId = await qiniuClient.uploadCert(this.cert, this.appendTimeSuffix("certd"));
    } else {
      certId = this.cert;
    }

    // const url1 = `https://uc.qiniuapi.com/v2/domains?tbl=handfree`;
    // const ossDomains = await qiniuClient.doRequestV2({
    //   url: url1,
    //   method: "get",
    //   body: null,
    //   contentType: "application/x-www-form-urlencoded",
    // });
    // this.logger.info("ossDomains:", ossDomains);
    //
    // const res = await qiniuClient.getCertBindings();
    // this.logger.info(res);

    this.logger.info(`开始修改证书,certId:${certId},domain:${this.domainName}`);
    await qiniuClient.bindCert({ certid: certId, domain: this.domainName });

    this.logger.info("部署完成");
  }
}
new QiniuDeployCertToOSS();
