import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { optionsUtils } from "@certd/basic";
import { JDCloudAccess } from "../access.js";

@IsTaskPlugin({
  name: "JDCloudDeployToCDN",
  title: "京东云-部署证书至CDN",
  icon: "svg:icon-jdcloud",
  group: pluginGroups.jdcloud.key,
  desc: "京东云内容分发网络",
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class JDCloudDeployToCDN extends AbstractTaskPlugin {
  @TaskInput({
    title: "域名证书",
    helper: "请选择前置任务输出的域名证书",
    component: {
      name: "output-selector",
      from: [...CertApplyPluginNames, "JDCloudUploadCert"],
    },
    required: true,
  })
  cert!: CertInfo | number;

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
      title: "CDN加速域名",
      helper: "你在京东云上配置的CDN加速域名，比如:certd.docmirror.cn",
      action: JDCloudDeployToCDN.prototype.onGetDomainList.name,
      watches: ["certDomains", "accessId"],
      required: true,
    })
  )
  domainName!: string | string[];

  async onInstance() {}

  async execute(): Promise<void> {
    this.logger.info("开始部署证书到京东云CDN");
    const access = await this.getAccess<JDCloudAccess>(this.accessId);

    const service = await this.getClient(access);
    let certId = this.cert;
    const certName = this.appendTimeSuffix("certd");
    if (typeof certId === "object") {
      const certInfo = this.cert as CertInfo;
      this.logger.info(`开始上传证书`);

      const sslService = await this.getSslClient(access);
      const res = await access.catchCall(() =>
        sslService.uploadCert({
          // certName	String	True		证书名称
          // keyFile	String	True		私钥
          // certFile	String	True		证书
          // aliasName	String	False		证书别名
          certName: certName,
          keyFile: certInfo.key,
          certFile: certInfo.crt,
          aliasName: certName,
        })
      );
      certId = res.result.certId;
    }

    // const certInfo = this.cert as CertInfo;
    for (const domain of this.domainName) {
      this.logger.info(`开始部署域名${domain}证书`);
      const res = await service.setHttpType({
        /**
         * @param {string} opts.domain - 用户域名
         * @param {} [opts.httpType] - http类型,只能为http或者https,默认为http.当设为https时,需要调用“设置通讯协议”接口上传证书和私钥  optional
         * @param {} [opts.certificate] - 用户证书,当Type为https时必须设置  optional
         * @param {} [opts.rsaKey] - 证书私钥  optional
         * @param {} [opts.jumpType] - 有三种类型：default、http、https  optional
         * @param {} [opts.certFrom] - 证书来源有两种类型：default,ssl  optional
         * @param {} [opts.sslCertId] - ssl证书id  optional
         * @param {} [opts.syncToSsl] - 是否同步到ssl,boolean值，取值true或者false  optional
         * @param {} [opts.certName] - syncToSsl是true时，certName是必填项  optional
         */
        domain,
        httpType: "https",
        // certificate: certInfo.crt,
        // rsaKey: certInfo.key,
        jumpType: "default",
        certFrom: "ssl",
        sslCertId: certId, // 不用certId 方式，会报证书已存在错误，目前还没找到怎么查询重复证书
        syncToSsl: false,
        certName: certName,
      });
      this.logger.info(`部署域名${domain}证书成功:${JSON.stringify(res)}`);
      await this.ctx.utils.sleep(2000);
    }

    this.logger.info("部署完成");
  }

  async getClient(access: JDCloudAccess) {
    const { JDCdnService } = await import("@certd/jdcloud");
    const service = new JDCdnService({
      credentials: {
        accessKeyId: access.accessKeyId,
        secretAccessKey: access.secretAccessKey,
      },
      regionId: "cn-north-1", //地域信息，某个api调用可以单独传参regionId，如果不传则会使用此配置中的regionId
    });
    return service;
  }

  async getSslClient(access: JDCloudAccess) {
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

  async onGetDomainList(data: any) {
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
      service.getDomainList({
        pageNumber: 1,
        pageSize: 50,
      })
    );
    // @ts-ignore
    const list = res?.result?.domains;
    if (!list || list.length === 0) {
      throw new Error("找不到加速域名，您可以手动输入");
    }
    const options = list.map((item: any) => {
      return {
        value: item.domain,
        label: item.domain,
        domain: item.domain,
      };
    });
    return optionsUtils.buildGroupOptions(options, this.certDomains);
  }
}

new JDCloudDeployToCDN();
