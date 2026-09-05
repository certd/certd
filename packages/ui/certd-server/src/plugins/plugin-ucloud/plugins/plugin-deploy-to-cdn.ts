import { AbstractTaskPlugin, IsTaskPlugin, PageSearch, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { UCloudAccess } from "../access.js";

@IsTaskPlugin({
  //命名规范，插件类型+功能（就是目录plugin-demo中的demo），大写字母开头，驼峰命名
  name: "UCloudDeployToCDN",
  title: "UCloud-部署到CDN",
  desc: "将证书部署到UCloud CDN",
  icon: "svg:icon-ucloud",
  //插件分组
  group: pluginGroups.ucloud.key,
  needPlus: false,
  default: {
    //默认值配置照抄即可
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
//类名规范，跟上面插件名称（name）一致
export class UCloudDeployToCDN extends AbstractTaskPlugin {
  //证书选择，此项必须要有
  @TaskInput({
    title: "域名证书",
    helper: "请选择前置任务输出的域名证书",
    component: {
      name: "output-selector",
      from: [...CertApplyPluginNames, ":UCloudCertId:"],
    },
    // required: true, // 必填
  })
  cert!: CertInfo | { type: string; id: number; name: string };

  @TaskInput(createCertDomainGetterInputDefine({ props: { required: false } }))
  certDomains!: string[];

  //授权选择框
  @TaskInput({
    title: "UCloud授权",
    component: {
      name: "access-selector",
      type: "ucloud", //固定授权类型
    },
    required: true, //必填
  })
  accessId!: string;
  //

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "域名列表",
      helper: "要更新的UCloud域名列表",

      action: UCloudDeployToCDN.prototype.onGetDomainList.name,
    })
  )
  domainList!: string[];

  //插件实例化时执行的方法
  async onInstance() {}

  //插件执行方法
  async execute(): Promise<void> {
    const access = await this.getAccess<UCloudAccess>(this.accessId);
    const certType = "ussl";
    let certId = 0;
    let certName = this.appendTimeSuffix("certd");
    // @ts-ignore
    if (this.cert?.id) {
      //从上一步传过来的ssl证书
      // @ts-ignore
      certId = this.cert.id;
      // @ts-ignore
      certName = this.cert.name;
    } else {
      const cert = await access.SslUploadCert({
        cert: this.cert as CertInfo,
      });
      certId = cert.id;
      certName = cert.name;
    }

    for (const item of this.domainList) {
      this.logger.info(`----------- 开始更新域名：${item}`);
      await this.deployToCdn({
        access: access,
        certName: certName,
        domain: item,
        certId: certId,
        certType: certType,
      });
      this.logger.info(`----------- 更新域名证书${item}成功`);
    }

    this.logger.info("部署完成");
  }

  async deployToCdn(req: { access: any; domain: string; certId: number; certType: string; certName: string }) {
    const { access, domain, certId, certType, certName } = req;

    const domainsRes = await access.invoke({
      Action: "GetUcdnDomainConfig",
      ProjectId: access.projectId,
      Domain: [domain],
    });

    const domainList = domainsRes.DomainList || [];
    const domainConf = domainList.find((item: any) => item.Domain === domain);
    if (!domainConf) {
      throw new Error(`没有找到CDN域名${domain}`);
    }

    const domainId = domainConf.DomainId;
    const httpsStatusAbroad = domainConf.HttpsStatusAbroad;
    let httpsStatusCn = domainConf.HttpsStatusCn;
    if (httpsStatusAbroad === "disable" && httpsStatusCn === "disable") {
      this.logger.info(`原CDN域名HTTPS未开启，将开启国内加速`);
      httpsStatusCn = "enable";
    }

    const body: any = {
      Action: "UpdateUcdnDomainHttpsConfigV2",
      DomainId: domainId,
      CertName: certName,
      CertId: certId,
      CertType: certType,
      EnableHttp2: domainConf.EnableHttp2 || "0",
      RedirectHttp2Https: domainConf.RedirectHttp2Https || "0",
      TlsVersion: domainConf.TlsVersion || "tlsv1.0,tlsv1.1,tlsv1.2,tlsv1.3",
    };
    if (httpsStatusAbroad === "enable") {
      body.HttpsStatusAbroad = httpsStatusAbroad;
    }
    if (httpsStatusCn === "enable") {
      body.HttpsStatusCn = httpsStatusCn;
    }
    this.logger.info(`----------- 更新CDN域名HTTPS配置${domainId}，${JSON.stringify(body)}`);
    const resp = await access.invoke(body);
    this.logger.info(`----------- 部署CDN证书${domainId}成功，${JSON.stringify(resp)}`);
  }

  async onGetDomainList(req: PageSearch = {}) {
    const access = await this.getAccess<UCloudAccess>(this.accessId);

    const pageNo = req.pageNo ?? 1;
    const pageSize = req.pageSize ?? 100;
    const res = await access.CdnDominList({
      PageNo: pageNo,
      PageSize: pageSize,
    });
    const total = res.TotalCount;
    const list = res.DomainInfoList || [];
    if (!list || list.length === 0) {
      throw new Error("没有找到CDN域名，请先在控制台创建CDN域名");
    }

    /**
     *  "Domain": "ucloud.certd.handfree.work",
      "DomainId": "ucdn-1kwdtph5ygbb"
     */
    const options = list.map((item: any) => {
      return {
        label: `${item.Domain}<${item.DomainId}>`,
        value: `${item.Domain}`,
        domain: item.Domain,
      };
    });
    return {
      list: this.ctx.utils.options.buildGroupOptions(options, this.certDomains),
      total: total,
      pageNo: pageNo,
      pageSize: pageSize,
    };
  }
}

//实例化一下，注册插件
new UCloudDeployToCDN();
