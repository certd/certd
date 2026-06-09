import { IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { AcePanelAccess } from "../access.js";
import { AbstractPlusTaskPlugin } from "@certd/plugin-plus";

@IsTaskPlugin({
  name: "AcePanelPanelCert",
  title: "AcePanel-面板证书",
  desc: "部署AcePanel面板证书",
  icon: "svg:icon-lucky",
  group: pluginGroups.panel.key,
  needPlus: true,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class AcePanelPanelCert extends AbstractPlusTaskPlugin {
  @TaskInput({
    title: "域名证书",
    helper: "请选择前置任务输出的域名证书",
    component: {
      name: "output-selector",
      from: [...CertApplyPluginNames],
    },
  })
  cert!: CertInfo;

  @TaskInput({
    title: "ACEPanel授权",
    component: {
      name: "access-selector",
      type: "acepanel",
    },
    required: true,
  })
  accessId!: string;

  async onInstance() {}

  async execute(): Promise<void> {
    const access = await this.getAccess<AcePanelAccess>(this.accessId);

    this.logger.info("开始部署面板证书");
    await access.updatePanelCert(this.cert.crt, this.cert.key);
    this.logger.info("面板证书部署完成");
  }
}

new AcePanelPanelCert();
