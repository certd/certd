import { IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertInfo } from "@certd/plugin-lib";
import { AbstractPlusTaskPlugin } from "@certd/plugin-plus";
import { SynologyClient } from "@certd/plugin-plus";
import { SynologyAccess } from "../access.js";
import { CertApplyPluginNames } from "@certd/plugin-lib";
@IsTaskPlugin({
  name: "SynologyDeployToPanel",
  title: "群晖-部署证书到群晖面板",
  icon: "simple-icons:synology",
  group: pluginGroups.panel.key,
  desc: "Synology，支持6.x以上版本",
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
  needPlus: true,
})
export class SynologyDeployToPanel extends AbstractPlusTaskPlugin {
  //测试参数
  @TaskInput({
    title: "群晖证书描述",
    component: {
      name: "a-input",
      vModel: "value",
      placeholder: "群晖证书描述",
    },
    required: false,
    helper: "在群晖证书管理页面里面，选择证书，点击操作，给证书设置描述，然后填写到这里\n如果不填，则覆盖更新全部证书",
  })
  certName!: string;

  //证书选择，此项必须要有
  @TaskInput({
    title: "域名证书",
    helper: "请选择前置任务输出的域名证书",
    component: {
      name: "output-selector",
      from: [...CertApplyPluginNames],
    },
    required: true,
  })
  cert!: CertInfo;

  //授权选择框
  @TaskInput({
    title: "群晖授权",
    helper: "群晖登录授权，请确保账户是管理员用户组\n群晖OTP授权有效期只有30天，您还需要添加“群晖-刷新OTP登录有效期”任务做登录有效期保活",
    component: {
      name: "access-selector",
      type: "synology",
    },
    required: true,
  })
  accessId!: string;

  async onInstance() {}
  async execute(): Promise<void> {
    const access: SynologyAccess = await this.getAccess<SynologyAccess>(this.accessId);
    if (access.deviceId) {
      this.logger.warn(`检测到您开启了二次认证，建议将证书申请任务的更新天数修改为65天，以保证每个月在群辉部署执行一次，刷新二次认证的有效期`);
    }

    const client = new SynologyClient(access as any, this.ctx.http, this.ctx.logger, access.skipSslVerify);
    // await client.init();
    await client.doLogin();
    // const res = await client.getInfo();
    // this.logger.info(res);
    const certListRes = await client.getCertList();
    if (this.certName) {
      const certItem = certListRes.certificates.find((item: any) => {
        return item.desc === this.certName || item.subject.common_name === this.certName;
      });
      if (!certItem) {
        throw new Error(`未找到证书: ${this.certName}`);
      }
      this.logger.info(`找到证书: ${certItem.id}`);
      await client.updateCertToPanel(certItem, this.cert);
    } else {
      this.logger.info("开始更新全部证书");
      for (const item of certListRes.certificates) {
        this.logger.info(`更新证书: ${item.id}`);
        await client.updateCertToPanel(item, this.cert);
      }
    }
  }
}
new SynologyDeployToPanel();
