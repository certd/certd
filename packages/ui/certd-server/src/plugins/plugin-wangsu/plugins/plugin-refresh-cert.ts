import { AbstractTaskPlugin, IsTaskPlugin, PageSearch, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { WangsuAccess } from "../access.js";

@IsTaskPlugin({
  //命名规范，插件类型+功能（就是目录plugin-demo中的demo），大写字母开头，驼峰命名
  name: "WangsuRefreshCert",
  title: "网宿-更新证书",
  desc: "网宿证书自动更新",
  icon: "svg:icon-wangsu",
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
export class WangsuRefreshCert extends AbstractTaskPlugin {
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
    title: "网宿授权",
    component: {
      name: "access-selector",
      type: "wangsu", //固定授权类型
    },
    required: true, //必填
  })
  accessId!: string;
  //

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "证书Id",
      helper: "要更新的网宿证书id",
      action: WangsuRefreshCert.prototype.onGetCertList.name,
      pager: false,
      search: false,
    })
  )
  certList!: string[];

  //插件实例化时执行的方法
  async onInstance() {}

  //插件执行方法
  async execute(): Promise<void> {
    const access = await this.getAccess<WangsuAccess>(this.accessId);

    for (const item of this.certList) {
      this.logger.info(`----------- 开始更新证书：${item}`);
      await access.updateCert({
        certId: item,
        cert: this.cert,
      });
      this.logger.info(`----------- 更新证书${item}成功`);
    }

    this.logger.info("部署完成");
  }

  async onGetCertList(data: PageSearch = {}) {
    const access = await this.getAccess<WangsuAccess>(this.accessId);

    const list = await access.getCertList({});
    if (!list || list.length === 0) {
      throw new Error("没有找到证书，请先在控制台上传一次证书且关联域名");
    }

    /**
     * certificate-id
     * name
     * dns-names
     */
    const options = list.map((item: any) => {
      const domains = item["dns-names"];
      const certId = item["certificate-id"];
      return {
        label: `${item.name}<${certId}-${domains[0]}>`,
        value: certId,
        domain: item["dns-names"],
      };
    });
    return {
      list: this.ctx.utils.options.buildGroupOptions(options, this.certDomains),
      total: list.length,
      pageNo: 1,
      pageSize: list.length,
    };
  }
}

//实例化一下，注册插件
new WangsuRefreshCert();
