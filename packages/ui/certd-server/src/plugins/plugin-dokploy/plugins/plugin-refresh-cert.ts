import { AbstractTaskPlugin, IsTaskPlugin, PageSearch, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo, CertReader } from "@certd/plugin-cert";
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { DokployAccess } from "../access.js";

@IsTaskPlugin({
  //命名规范，插件类型+功能（就是目录plugin-demo中的demo），大写字母开头，驼峰命名
  name: "DokployRefreshCert",
  title: "Dokploy-部署server证书",
  desc: "自动更新Dokploy server证书",
  icon: "svg:icon-lucky",
  //插件分组
  group: pluginGroups.panel.key,
  needPlus: true,
  default: {
    //默认值配置照抄即可
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
//类名规范，跟上面插件名称（name）一致
export class DokployRefreshCert extends AbstractTaskPlugin {
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
    title: "Dokploy授权",
    component: {
      name: "access-selector",
      type: "dokploy", //固定授权类型
    },
    required: true, //必填
  })
  accessId!: string;
  //

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "证书名称",
      helper: "要更新的证书名称，如果这里没有，请先给手动绑定一次证书",
      action: DokployRefreshCert.prototype.onGetServerList.name,
      pager: false,
      search: false,
    })
  )
  serverList!: string[];

  //插件实例化时执行的方法
  async onInstance() {}

  //插件执行方法
  async execute(): Promise<void> {
    const access = await this.getAccess<DokployAccess>(this.accessId);

    if (!this.serverList || this.serverList.length === 0) {
      throw new Error("请先选择要部署证书的server");
    }

    // await access.createCert({cert:this.cert})

    const oldCertList = await access.getCertList();

    const certReader = new CertReader(this.cert);
    for (const serverId of this.serverList) {
      this.logger.info(`----------- 开始部署server证书：${serverId}`);
      if (!serverId) {
        this.logger.error(`----------- serverId不能为空，跳过更新`);
        continue;
      }
      await access.createCert({
        name: certReader.buildCertName(),
        cert: this.cert,
        serverId: serverId,
      });
      this.logger.info(`----------- 部署server${serverId}证书成功`);
    }

    this.logger.info(`----------- 等待10秒后开始清理过期证书`);
    await this.ctx.utils.sleep(10000);
    //清理过期证书
    for (const certItem of oldCertList) {
      const certDetail = CertReader.readCertDetail(certItem.certificateData);
      if (certDetail.expires.getTime() < new Date().getTime()) {
        this.logger.info(`----------- 证书${certItem.certificateId}已过期`);
        await access.removeCert({ id: certItem.certificateId });
        this.logger.info(`----------- 清理过期证书${certItem.certificateId}成功`);
      } else {
        this.logger.info(`----------- 证书${certItem.certificateId}还未过期`);
      }
    }

    this.logger.info("部署完成");
  }

  async onGetServerList(data: PageSearch = {}) {
    const access = await this.getAccess<DokployAccess>(this.accessId);

    const res = await access.getServerList();
    const list = res;
    if (!list || list.length === 0) {
      throw new Error("没有找到Server，你可以直接手动输入serverId");
    }

    const options = list.map((item: any) => {
      return {
        label: `${item.name}<${item.serverId}>`,
        value: `${item.serverId}`,
      };
    });
    return options;
  }
}

//实例化一下，注册插件
new DokployRefreshCert();
