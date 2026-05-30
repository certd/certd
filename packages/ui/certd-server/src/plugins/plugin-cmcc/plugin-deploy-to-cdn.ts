import { IsTaskPlugin, PageSearch, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { AbstractPlusTaskPlugin } from "@certd/plugin-plus";
import { CmccAccess } from "./access.js";

@IsTaskPlugin({
  //命名规范，插件类型+功能（就是目录plugin-demo中的demo），大写字母开头，驼峰命名
  name: "CmccDeployCertToCdn",
  title: "中国移动-部署证书到CDN",
  desc: "中国移动自动部署证书到CDN",
  icon: "svg:icon-cmcc",
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
export class CmccDeployCertToCdn extends AbstractPlusTaskPlugin {
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
    title: "中国移动-授权",
    component: {
      name: "access-selector",
      type: "cmcc", //固定授权类型
    },
    required: true, //必填
  })
  accessId!: string;
  //

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "加速域名",
      helper: "要更新的中国移动CDN域名",
      action: CmccDeployCertToCdn.prototype.onGetDomainList.name,
      pager: false,
      search: false,
    })
  )
  domainList!: string[];

  //插件实例化时执行的方法
  async onInstance() {}

  //插件执行方法
  async execute(): Promise<void> {
    const access = await this.getAccess<CmccAccess>(this.accessId);

    const client = await access.getCmccClient();
    this.logger.info(`----------- 开始更新证书：${this.domainList}`);

    const newCert = await client.uploadCert({
      cert: this.cert,
    });

    const certId = newCert.unique_id;
    this.logger.info(`----------- 上传证书成功,证书ID:${certId}`);

    await client.deployCertToCdn({
      certId: certId,
      domainNames: this.domainList,
    });
    this.logger.info(`----------- 更新证书${this.domainList}成功,等待10s`);
    await this.ctx.utils.sleep(10000);
    this.logger.info("部署完成");
  }

  async onGetDomainList(data: PageSearch = {}) {
    const access = await this.getAccess<CmccAccess>(this.accessId);
    const client = await access.getCmccClient();
    const res = await client.getDomainList({});
    const list = res || [];
    if (!list || list.length === 0) {
      throw new Error("没有找到加速域名");
    }

    /**
     * certificate-id
     * name
     * dns-names
     */
    const options = list.map((item: any) => {
      return {
        label: `${item.domainName}`,
        value: item.domainName,
        domain: item.domainName,
      };
    });
    return {
      list: this.ctx.utils.options.buildGroupOptions(options, this.certDomains),
    };
  }
}

//实例化一下，注册插件
new CmccDeployCertToCdn();
