import { AbstractTaskPlugin, IsTaskPlugin, Pager, PageSearch, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { FarcdnAccess } from "../access.js";

@IsTaskPlugin({
  //命名规范，插件类型+功能（就是目录plugin-demo中的demo），大写字母开头，驼峰命名
  name: "FarcdnRefreshCert",
  title: "farcdn-更新证书",
  desc: "www.farcdn.net",
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
export class FarcdnRefreshCert extends AbstractTaskPlugin {
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
    title: "Farcdn授权",
    component: {
      name: "access-selector",
      type: "farcdn", //固定授权类型
    },
    required: true, //必填
  })
  accessId!: string;
  //

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "证书Id",
      helper: "要更新的Farcdn证书id",

      action: FarcdnRefreshCert.prototype.onGetCertList.name,
    })
  )
  certList!: number[];

  //插件实例化时执行的方法
  async onInstance() {}

  //插件执行方法
  async execute(): Promise<void> {
    const access = await this.getAccess<FarcdnAccess>(this.accessId);

    for (const item of this.certList) {
      this.logger.info(`----------- 开始更新证书：${item}`);
      await access.updateSSLCert({
        sslCertId: item,
        cert: this.cert,
      });
      this.logger.info(`----------- 更新证书${item}成功`);
    }

    this.logger.info("部署完成");
  }

  async onGetCertList(data: PageSearch = {}) {
    const access = await this.getAccess<FarcdnAccess>(this.accessId);

    const pager = new Pager(data);
    const res = await access.getSSLCertList({
      offset: pager.getOffset(),
      size: pager.pageSize,
    });
    const list = res.list;
    if (!list || list.length === 0) {
      throw new Error("没有找到证书，请先在控制台上传一次证书且关联网站");
    }

    const options = list.map((item: any) => {
      return {
        label: `${item.name}<${item.id}>`,
        value: item.id,
        domain: item.dnsNames,
      };
    });
    return {
      list: this.ctx.utils.options.buildGroupOptions(options, this.certDomains),
      total: res.total,
      pageNo: pager.pageNo,
      pageSize: pager.pageSize,
    };
  }
}

//实例化一下，注册插件
new FarcdnRefreshCert();
