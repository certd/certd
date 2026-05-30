import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput, TaskOutput } from "@certd/pipeline";
import { HuaweiAccess } from "../../access/index.js";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { createCertDomainGetterInputDefine } from "@certd/plugin-lib";
import { resetLogConfigure } from "@certd/basic";

@IsTaskPlugin({
  name: "HauweiUploadToCCM",
  title: "华为云-上传证书至CCM",
  icon: "svg:icon-huawei",
  group: pluginGroups.huawei.key,
  desc: "上传证书到华为云云证书管理（CCM）",
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class HauweiUploadToCCM extends AbstractTaskPlugin {
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

  @TaskInput(createCertDomainGetterInputDefine({ props: { required: false } }))
  certDomains!: string[];

  @TaskInput({
    title: "Access授权",
    helper: "华为云授权AccessKeyId、AccessKeySecret",
    component: {
      name: "access-selector",
      type: "huawei",
    },
    required: true,
  })
  accessId!: string;
  @TaskOutput({
    title: "华为云CertId",
  })
  huaweiCertId!: string;

  async execute(): Promise<void> {
    this.logger.info("开始部署证书到华为云CCM");
    const { client } = await this.getCcmClient();

    const res = await client.importCertificate({
      name: this.appendTimeSuffix("certd"),
      certificate: this.cert.crt,
      private_key: this.cert.key,
      duplicate_check: false,
    });
    this.huaweiCertId = res.certificate_id;
    this.logger.info(`上传证书到华为云ccm完成,certificate_id:${this.huaweiCertId}`);
  }

  async getCcmClient() {
    const access = await this.getAccess<HuaweiAccess>(this.accessId);
    const { BasicCredentials } = await import("@huaweicloud/huaweicloud-sdk-core");
    const { ClientBuilder } = await import("@huaweicloud/huaweicloud-sdk-core/ClientBuilder.js");
    //@ts-ignore
    const { HuaweiCcmClient } = await import("./ccm-client.js");

    //恢复华为云把log4j的config改了的问题
    resetLogConfigure();

    const credentials = new BasicCredentials().withAk(access.accessKeyId).withSk(access.accessKeySecret);
    const client = new ClientBuilder(hcClient => {
      return new HuaweiCcmClient(hcClient);
    })
      .withCredential(credentials)
      .withEndpoint("https://scm.cn-north-4.myhuaweicloud.com")
      .build();
    return {
      client,
    };
  }
}
