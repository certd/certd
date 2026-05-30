import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo, CertReader } from "@certd/plugin-cert";
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { FlexCDNAccess } from "../access.js";
import { FlexCDNClient } from "../client.js";

@IsTaskPlugin({
  //命名规范，插件类型+功能（就是目录plugin-demo中的demo），大写字母开头，驼峰命名
  name: "FlexCDNRefreshCert",
  title: "FlexCDN-更新证书",
  icon: "svg:icon-lucky",
  //插件分组
  group: pluginGroups.cdn.key,
  needPlus: false,
  default: {
    //默认值配置照抄即可
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
//类名规范，跟上面插件名称（name）一致
export class FlexCDNRefreshCert extends AbstractTaskPlugin {
  //证书选择，此项必须要有
  @TaskInput({
    title: "域名证书",
    helper: "请选择前置任务输出的域名证书",
    component: {
      name: "output-selector",
      from: [...CertApplyPluginNames],
    },
    // required: true, // 必填
  })
  cert!: CertInfo;

  @TaskInput(createCertDomainGetterInputDefine({ props: { required: false } }))
  certDomains!: string[];

  //授权选择框
  @TaskInput({
    title: "FlexCDN授权",
    component: {
      name: "access-selector",
      type: "flexcdn", //固定授权类型
    },
    required: true, //必填
  })
  accessId!: string;
  //

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "证书Id",
      helper: "要更新的Flex证书id",
      action: FlexCDNRefreshCert.prototype.onGetCertList.name,
    })
  )
  certList!: number[];

  //插件实例化时执行的方法
  async onInstance() {}

  //插件执行方法
  async execute(): Promise<void> {
    const access: FlexCDNAccess = await this.getAccess<FlexCDNAccess>(this.accessId);

    const client = new FlexCDNClient({
      http: this.ctx.http,
      logger: this.logger,
      access,
    });
    await client.getToken();
    for (const item of this.certList) {
      this.logger.info(`----------- 开始更新证书：${item}`);

      const res = await client.doRequest({
        url: `/SSLCertService/findEnabledSSLCertConfig`,
        data: {
          sslCertId: item,
        },
      });

      const sslCert = JSON.parse(this.ctx.utils.hash.base64Decode(res.sslCertJSON));
      this.logger.info(`证书信息：${sslCert.name}，${sslCert.dnsNames}`);
      const certReader = new CertReader(this.cert);
      /**
       *   commonNames: commonNames,
       *       dnsNames: dnsNames,
       *       timeBeginAt: Math.floor((new Date(currentInfo.validFrom)).getTime() / 1000),
       *       timeEndAt: Math.floor((new Date(currentInfo.validTo)).getTime() / 1000),
       *
       */
      const topCrt = CertReader.readCertDetail(certReader.cert.ic);
      const commonNames = [topCrt.detail.issuer.commonName];
      const dnsNames = certReader.getAllDomains();
      const timeBeginAt = Math.floor(certReader.detail.notBefore.getTime() / 1000);
      const timeEndAt = Math.floor(certReader.detail.notAfter.getTime() / 1000);
      const body = {
        ...sslCert, // inherit old cert info like name and description
        commonNames,
        dnsNames,
        timeBeginAt,
        timeEndAt,
        name: sslCert.name,
        sslCertId: item,
        certData: this.ctx.utils.hash.base64(this.cert.crt),
        keyData: this.ctx.utils.hash.base64(this.cert.key),
      };
      await client.doRequest({
        url: `/SSLCertService/updateSSLCert`,
        data: {
          ...body,
        },
      });

      this.logger.info(`----------- 更新证书${item}成功`);
    }

    this.logger.info("部署完成");
  }

  async onGetCertList() {
    const access: FlexCDNAccess = await this.getAccess<FlexCDNAccess>(this.accessId);
    const client = new FlexCDNClient({
      http: this.ctx.http,
      logger: this.logger,
      access,
    });
    await client.getToken();
    const res = await client.doRequest({
      url: "/SSLCertService/listSSLCerts",
      data: { size: 1000 },
      method: "POST",
    });
    const list = JSON.parse(this.ctx.utils.hash.base64Decode(res.sslCertsJSON));
    if (!list || list.length === 0) {
      throw new Error("没有找到证书，请先在控制台上传一次证书且关联网站");
    }

    const options = list.map((item: any) => {
      return {
        label: `${item.name}<${item.id}-${item.dnsNames?.[0]}>`,
        value: item.id,
        domain: item.dnsNames,
      };
    });
    return this.ctx.utils.options.buildGroupOptions(options, this.certDomains);
  }
}

//实例化一下，注册插件
new FlexCDNRefreshCert();
