import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { optionsUtils } from "@certd/basic";
import { JDCloudAccess } from "../access.js";

@IsTaskPlugin({
  name: "JDCloudUpdateCert",
  title: "京东云-更新已有证书",
  icon: "svg:icon-jdcloud",
  group: pluginGroups.jdcloud.key,
  desc: "更新SSL数字证书中的证书",
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class JDCloudUpdateCert extends AbstractTaskPlugin {
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

  @TaskInput(createCertDomainGetterInputDefine({ props: { required: false } }))
  certDomains!: string[];

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

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "要更新的证书id",
      helper: "您在京东云上已有的证书Id",
      action: JDCloudUpdateCert.prototype.onGetCertList.name,
      watches: ["certDomains", "accessId"],
      required: true,
    })
  )
  certIds!: string[];

  async onInstance() {}
  async execute(): Promise<void> {
    this.logger.info("开始部署证书到京东云CDN");
    const access = await this.getAccess<JDCloudAccess>(this.accessId);

    const service = await this.getClient(access);
    // let certId = this.cert
    // const certName = this.appendTimeSuffix("certd");
    // if (typeof certId !== 'string') {
    //   const certInfo = this.cert as CertInfo
    //   this.logger.info(`开始上传证书`)
    //
    //   const res  = await service.uploadCert({
    //     // certName	String	True		证书名称
    //     // keyFile	String	True		私钥
    //     // certFile	String	True		证书
    //     // aliasName	String	False		证书别名
    //     certName: certName,
    //     keyFile: certInfo.key,
    //     certFile: certInfo.crt,
    //     aliasName: certName
    //   })
    //   certId = res.result.certId
    // }

    const certInfo = this.cert as CertInfo;
    for (const certId of this.certIds) {
      this.logger.info(`开始更新证书：${certId}`);
      const res = await access.catchCall(() =>
        service.updateCert({
          /*
      @param {string} opts.certId - 证书Id
@param {string} opts.certId - 证书ID
@param {string} opts.keyFile - 私钥
@param {string} opts.certFile - 证书
@param {string} callback - callback
       */
          certId,
          certFile: certInfo.crt,
          keyFile: certInfo.key,
        })
      );
      this.logger.info(`更新证书${certId}成功:${JSON.stringify(res)}`);
      await this.ctx.utils.sleep(2000);
    }
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

  async onGetCertList(data: any) {
    if (!this.accessId) {
      throw new Error("请选择Access授权");
    }
    const access = await this.getAccess<JDCloudAccess>(this.accessId);

    const service = await this.getClient(access);
    /**
     * pageNumber	Integer	False	1	pageNumber,默认值1
     * pageSize
     */
    const res = await access.catchCall(() =>
      service.describeCerts({
        pageNumber: 1,
        pageSize: 100,
      })
    );
    // @ts-ignore
    const list = res?.result?.certListDetails;
    if (!list || list.length === 0) {
      throw new Error("找不到证书，您可以手动输入证书id");
    }
    const options = list.map((item: any) => {
      return {
        value: item.certId,
        label: `${item.certName}<${item.certId}_${item.commonName}>`,
        domain: item.commonName, // or item.dnsNames 证书所有域名
      };
    });
    return optionsUtils.buildGroupOptions(options, this.certDomains);
  }
}
new JDCloudUpdateCert();
