import { AbstractTaskPlugin, IsTaskPlugin, PageSearch, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { ZenlayerAccess } from "../access.js";

@IsTaskPlugin({
  //命名规范，插件类型+功能（就是目录plugin-demo中的demo），大写字母开头，驼峰命名
  name: "ZenlayerRefreshCert",
  title: "Zenlayer-刷新证书",
  desc: "刷新Zenlayer CDN证书",
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
export class ZenlayerRefreshCert extends AbstractTaskPlugin {
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
    title: "Zenlayer授权",
    component: {
      name: "access-selector",
      type: "zenlayer", //固定授权类型
    },
    required: true, //必填
  })
  accessId!: string;
  //

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "证书ID列表",
      helper: "要更新的Zenlayer证书ID列表",

      action: ZenlayerRefreshCert.prototype.onGetCertList.name,
    })
  )
  certList!: string[];

  //插件实例化时执行的方法
  async onInstance() {}

  //插件执行方法
  async execute(): Promise<void> {
    const access = await this.getAccess<ZenlayerAccess>(this.accessId);

    for (const certId of this.certList) {
      await this.updateCert({
        access: access,
        certId: certId,
        cert: this.cert,
      });
      this.logger.info(`刷新证书${certId}成功`);
      await this.ctx.utils.sleep(1000);
    }

    this.logger.info("部署完成");
  }

  async updateCert(req: { access: ZenlayerAccess; certId: string; cert: CertInfo }) {
    const { access, certId, cert } = req;
    // ModifyCertificate
    await access.doRequest({
      url: "/api/v2/cdn",
      action: "ModifyCertificate",
      data: {
        /**
         * certificateId
certificateContent
certificateKey
          */
        certificateId: certId,
        certificateContent: cert.crt,
        certificateKey: cert.key,
      },
    });
  }
  async onGetCertList(req: PageSearch = {}) {
    const access = await this.getAccess<ZenlayerAccess>(this.accessId);

    const pageNo = req.pageNo ?? 1;
    const pageSize = req.pageSize ?? 100;
    const res = await access.getCertList({
      pageNo: pageNo,
      pageSize: pageSize,
    });
    const total = res.totalCount;
    const list = res.dataSet || [];
    if (!list || list.length === 0) {
      throw new Error("没有找到Zenlayer证书，请先在控制台CDN证书管理创建证书");
    }

    /**
     *  "Domain": "ucloud.certd.handfree.work",
      "DomainId": "ucdn-1kwdtph5ygbb"
     */
    const options = list.map((item: any) => {
      return {
        label: `${item.certificateLabel}<${item.certificateId}-${item.common}>`,
        value: `${item.certificateId}`,
        domain: item.sans,
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
new ZenlayerRefreshCert();
