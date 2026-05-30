import { AbstractTaskPlugin, IsTaskPlugin, Pager, PageSearch, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { KsyunAccess } from "../access.js";

@IsTaskPlugin({
  //命名规范，插件类型+功能（就是目录plugin-demo中的demo），大写字母开头，驼峰命名
  name: "KsyunRefreshCert",
  title: "金山云-更新CDN证书",
  desc: "金山云自动更新CDN证书",
  icon: "svg:icon-ksyun",
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
export class KsyunRefreshCDNCert extends AbstractTaskPlugin {
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
    title: "金山云授权",
    component: {
      name: "access-selector",
      type: "ksyun", //固定授权类型
    },
    required: true, //必填
  })
  accessId!: string;
  //

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "证书Id",
      helper: "要更新的金山云CDN证书id，如果这里没有，请先给cdn域名手动绑定一次证书",
      action: KsyunRefreshCDNCert.prototype.onGetCertList.name,
      pager: false,
      search: false,
    })
  )
  certList!: string[];

  //插件实例化时执行的方法
  async onInstance() {}

  //插件执行方法
  async execute(): Promise<void> {
    const access = await this.getAccess<KsyunAccess>(this.accessId);

    const client = await access.getCdnClient();
    for (const certId of this.certList) {
      this.logger.info(`----------- 开始更新证书：${certId}`);

      const oldCert = await access.getCert({
        client,
        certId: certId,
      });

      await access.updateCert({
        client,
        certId: certId,
        certName: oldCert.CertificateName,
        cert: this.cert,
      });
      this.logger.info(`----------- 更新证书${certId}成功`);
    }

    this.logger.info("部署完成");
  }

  async onGetCertList(data: PageSearch = {}) {
    const access = await this.getAccess<KsyunAccess>(this.accessId);

    const client = await access.getCdnClient();
    const pager = new Pager(data);
    const res = await access.getCertList({ client, pageNo: pager.pageNo, pageSize: pager.pageSize });
    const list = res.Certificates;
    if (!list || list.length === 0) {
      throw new Error("没有找到证书，请先在控制台手动上传一次证书");
    }

    const total = res.TotalCount;

    /**
     * certificate-id
     * name
     * dns-names
     */
    const options = list.map((item: any) => {
      return {
        label: `${item.CertificateName}<${item.CertificateId}-${item.ConfigDomainNames}>`,
        value: item.CertificateId,
        domain: item.ConfigDomainNames,
      };
    });
    return {
      list: this.ctx.utils.options.buildGroupOptions(options, this.certDomains),
      total: total,
      pageNo: pager.pageNo,
      pageSize: pager.pageSize,
    };
  }
}

//实例化一下，注册插件
new KsyunRefreshCDNCert();
