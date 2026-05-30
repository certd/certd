import { IsTaskPlugin, PageSearch, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { ApisixAccess } from "../access.js";
import { AbstractPlusTaskPlugin } from "@certd/plugin-plus";
@IsTaskPlugin({
  //命名规范，插件类型+功能（就是目录plugin-demo中的demo），大写字母开头，驼峰命名
  name: "ApisixRefreshCert",
  title: "APISIX-更新证书",
  desc: "自动更新APISIX证书",
  icon: "svg:icon-lucky",
  //插件分组
  group: pluginGroups.cdn.key,
  needPlus: true,
  default: {
    //默认值配置照抄即可
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
//类名规范，跟上面插件名称（name）一致
export class ApisixRefreshCDNCert extends AbstractPlusTaskPlugin {
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
    title: "Apisix授权",
    component: {
      name: "access-selector",
      type: "apisix", //固定授权类型
    },
    required: true, //必填
  })
  accessId!: string;
  //

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "证书Id",
      helper: "要更新的证书id，如果这里没有，请先给手动绑定一次证书",
      action: ApisixRefreshCDNCert.prototype.onGetCertList.name,
      pager: false,
      search: false,
    })
  )
  certList!: string[];

  //插件实例化时执行的方法
  async onInstance() {}

  //插件执行方法
  async execute(): Promise<void> {
    const access = await this.getAccess<ApisixAccess>(this.accessId);

    // await access.createCert({cert:this.cert})

    for (const certId of this.certList) {
      this.logger.info(`----------- 开始更新证书：${certId}`);

      await access.updateCert({
        id: certId,
        cert: this.cert,
      });
      this.logger.info(`----------- 更新证书${certId}成功`);
    }

    this.logger.info("部署完成");
  }

  async onGetCertList(data: PageSearch = {}) {
    const access = await this.getAccess<ApisixAccess>(this.accessId);

    const res = await access.getCertList();
    const list = res.list;
    if (!list || list.length === 0) {
      throw new Error("没有找到证书，你可以直接手动输入id，如果id不存在将自动创建");
    }

    /**
     * certificate-id
     * name
     * dns-names
     */
    const options = list.map((item: any) => {
      return {
        label: `${item.value.snis[0]}<${item.value.id}>`,
        value: item.value.id,
        domain: item.value.snis,
      };
    });
    return {
      list: this.ctx.utils.options.buildGroupOptions(options, this.certDomains),
    };
  }
}

//实例化一下，注册插件
new ApisixRefreshCDNCert();
