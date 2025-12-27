import { AbstractTaskPlugin, IsTaskPlugin, PageSearch, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo, CertReader } from "@certd/plugin-cert";
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { UCloudAccess } from "../access.js";

@IsTaskPlugin({
  //命名规范，插件类型+功能（就是目录plugin-demo中的demo），大写字母开头，驼峰命名
  name: "UCloudDeployToWaf",
  title: "UCloud-部署到WAF",
  desc: "将证书部署到UCloud WAF",
  icon: "svg:icon-ucloud",
  //插件分组
  group: pluginGroups.ucloud.key,
  needPlus: false,
  default: {
    //默认值配置照抄即可
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed
    }
  }
})
//类名规范，跟上面插件名称（name）一致
export class UCloudDeployToWaf extends AbstractTaskPlugin {
  //证书选择，此项必须要有
  @TaskInput({
    title: "域名证书",
    helper: "请选择前置任务输出的域名证书",
    component: {
      name: "output-selector",
      from: [...CertApplyPluginNames]
    }
    // required: true, // 必填
  })
  cert!: CertInfo ;

  @TaskInput(createCertDomainGetterInputDefine({ props: { required: false } }))
  certDomains!: string[];

  //授权选择框
  @TaskInput({
    title: "UCloud授权",
    component: {
      name: "access-selector",
      type: "ucloud" //固定授权类型
    },
    required: true //必填
  })
  accessId!: string;
  //

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "域名列表",
      helper: "要更新的UCloud域名列表",

      action: UCloudDeployToWaf.prototype.onGetDomainList.name
    })
  )
  domainList!: string[];

  //插件实例化时执行的方法
  async onInstance() {
  }

  //插件执行方法
  async execute(): Promise<void> {
    const access = await this.getAccess<UCloudAccess>(this.accessId);

    const res = await this.addWafDomainCertificateInfo({
      access: access,
      cert: this.cert
    });
    this.logger.info(`----------- 上传证书成功：${JSON.stringify(res)}`);
    const certId = res.Id;

    for (const item of this.domainList) {
      this.logger.info(`----------- 开始更新域名：${item}`);

      const domainInfo =await access.WafSiteList({
        PageNo: 1,
        PageSize: 10,
        FullDomain: item
      })
      const list = domainInfo.DomainHostList || []
      if(!list || list.length === 0){
        throw new Error(`没有找到WAF域名${item}`)
      }
      const oldDomainInfo = list[0] as any

     
      const srcIpList = oldDomainInfo.SrcIPInfo.map((item: any) => item.SrcIP)

      await access.invoke({
        "Action": "UpdateWafDomainHostInfo",
        "ProjectId": access.projectId,
        "WorkRegions": oldDomainInfo.WorkRegions,
        "FullDomain": item,
        "CertificateID": certId ,
        "SrcIP":srcIpList
      })
     
      this.logger.info(`----------- 更新域名证书${item}成功`);
    }

    this.logger.info("部署完成");
  }


  async onGetDomainList(req: PageSearch = {}) {
    const access = await this.getAccess<UCloudAccess>(this.accessId);

    const pageNo = req.pageNo ?? 1;
    const pageSize = req.pageSize ?? 100;
    const res = await access.WafSiteList(
      {
        PageNo: pageNo,
        PageSize: pageSize
      }
    );
    const total = res.TotalCount;
    const list = res.DomainHostList || [];
    if (!list || list.length === 0) {
      throw new Error("没有找到WAF域名，请先在控制台添加WAF站点");
    }

    /**
     *  "Domain": "ucloud.certd.handsfree.work",
      "DomainId": "ucdn-1kwdtph5ygbb"
     */
    const options = list.map((item: any) => {
      return {
        label: `${item.FullDomain}<${item.RecordId}>`,
        value: `${item.FullDomain}`,
        domain: item.FullDomain
      };
    });
    return {
      list: this.ctx.utils.options.buildGroupOptions(options, this.certDomains),
      total: total,
      pageNo: pageNo,
      pageSize: pageSize
    };
  }

  async addWafDomainCertificateInfo(req: { access: UCloudAccess, cert: CertInfo }) {

    const certReader = new CertReader(req.cert)
    const certName = certReader.buildCertName()
    const crtBase64 = this.ctx.utils.hash.base64(req.cert.crt)
    const keyBase64 = this.ctx.utils.hash.base64(req.cert.key)
    const allDomains = certReader.getAllDomains().join(",")


    const resp = await req.access.invoke({
      "Action": "AddWafDomainCertificateInfo",
      /**
       * Domain	string	域名	Yes
 CertificateName	string	证书名称	Yes
 SslPublicKey	string	ssl公钥	Yes
 SslMD	string	证书MD5校验值，开启keyless只需要计算公钥的md5	Yes
 SslKeyless	string	keyless开关，默认关闭；可选值：开启(on)，关闭(off)	Yes
 
       */
      "Domain": allDomains,
      "CertificateName": certName,
      "SslPublicKey": crtBase64,
      "SslPrivateKey": keyBase64,
      "SslMD": this.ctx.utils.hash.md5(crtBase64),
      "SslKeyless": "off"
    });
    this.ctx.logger.info(`----------- 添加WAF域名证书信息成功，${JSON.stringify(resp)}`);
    return resp;
  }

}

//实例化一下，注册插件
new UCloudDeployToWaf();
