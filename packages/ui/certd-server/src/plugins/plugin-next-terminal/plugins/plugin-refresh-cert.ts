import { AbstractTaskPlugin, IsTaskPlugin, PageSearch, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertInfo } from "@certd/plugin-cert";
import { CertReader, createRemoteSelectInputDefine } from "@certd/plugin-lib";

@IsTaskPlugin({
  name: "NextTerminalRefreshCert",
  title: "NextTerminal-更新证书",
  icon: "clarity:plugin-line",
  desc: "更新 Next Terminal 证书",
  group: pluginGroups.panel.key,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class NextTerminalRefreshCert extends AbstractTaskPlugin {
  /**
   * 证书选择
   */
  @TaskInput({
    title: "域名证书",
    helper: "请选择前置任务输出的域名证书",
    component: {
      name: "output-selector",
      from: ["CertApply"],
    },
    required: true,
  })
  cert!: CertInfo;

  /**
   * Next Terminal 授权
   */
  @TaskInput({
    title: "Next Terminal 授权",
    helper: "选择 Next Terminal 授权配置",
    component: {
      name: "access-selector",
      type: "nextTerminal",
    },
    required: true,
  })
  accessId!: string;

  /**
   * 选择要更新的证书
   */
  @TaskInput(
    createRemoteSelectInputDefine({
      title: "选择证书",
      helper: "选择要更新的 Next Terminal 证书（支持多选），如果这里没有列出，需要先前往控制台上传证书，之后就可以自动更新",
      action: NextTerminalRefreshCert.prototype.onGetCertList.name,
      watches: ["accessId"],
      required: true,
      single: false,
    })
  )
  certIds!: string[];

  /**
   * 获取证书列表
   */
  async onGetCertList(req: PageSearch) {
    if (!this.accessId) {
      throw new Error("请选择 Next Terminal 授权");
    }

    const access = (await this.getAccess(this.accessId)) as any;
    const certList = await access.GetCertificateList(req);

    const options = certList.list.map((item: any) => {
      return {
        value: item.id,
        label: `${item.commonName} <${item.id}>`,
        domain: item.commonName,
      };
    });

    return options;
  }

  /**
   * 执行证书更新
   */
  async execute(): Promise<void> {
    const { cert, accessId, certIds } = this;

    try {
      const access = (await this.getAccess(accessId)) as any;

      // 确保 certIds 是数组
      const ids = Array.isArray(certIds) ? certIds : [certIds];

      const certReader = new CertReader(cert);
      const mainDomain = certReader.getMainDomain();

      for (const certId of ids) {
        this.logger.info(`更新 Next Terminal 证书: ${certId}`);

        await access.UpdateCertificate({
          certId,
          commonName: mainDomain,
          crt: cert.crt,
          key: cert.key,
        });

        this.logger.info(`证书 ${certId} 更新成功`);
      }

      this.logger.info(`成功更新 ${ids.length} 个 Next Terminal 证书`);
    } catch (e) {
      this.logger.error("更新 Next Terminal 证书失败", e);
      throw e;
    }
  }
}
