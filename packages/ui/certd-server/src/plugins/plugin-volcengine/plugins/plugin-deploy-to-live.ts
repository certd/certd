import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { VolcengineAccess } from "../access.js";
import { VolcengineClient } from "../ve-client.js";

@IsTaskPlugin({
  name: "VolcengineDeployToLive",
  title: "火山引擎-部署证书至Live",
  icon: "svg:icon-volcengine",
  group: pluginGroups.volcengine.key,
  desc: "部署至火山引擎视频直播",
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class VolcengineDeployToLive extends AbstractTaskPlugin {
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

  @TaskInput(createCertDomainGetterInputDefine({ props: { required: false } }))
  certDomains!: string[];

  @TaskInput({
    title: "Access授权",
    helper: "火山引擎AccessKeyId、AccessKeySecret",
    component: {
      name: "access-selector",
      type: "volcengine",
    },
    required: true,
  })
  accessId!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "直播域名",
      helper: "选择要部署证书的直播域名",
      action: VolcengineDeployToLive.prototype.onGetDomainList.name,
      watches: ["certDomains", "accessId"],
      required: true,
    })
  )
  domainList!: string | string[];

  async onInstance() {}

  async execute(): Promise<void> {
    this.logger.info("开始部署证书到火山引擎视频直播");
    const service = await this.getLiveService();
    const certId = await this.uploadCert(service);

    for (const item of this.domainList) {
      this.logger.info(`开始部署直播域名${item}证书`);
      await service.request({
        action: "BindCert",
        body: {
          Domain: item,
          HTTPS: true,
          ChainID: certId,
        },
      });
      this.logger.info(`部署直播域名${item}证书成功`);
    }

    this.logger.info("部署完成");
  }

  private async uploadCert(liveService: any) {
    const res = await liveService.request({
      action: "CreateCert",
      body: {
        Rsa: {
          Pubkey: this.cert.crt,
          Prikey: this.cert.key,
        },
        UseWay: "https",
      },
    });

    const certId = res.Result.ChainID;
    this.logger.info("证书上传成功", certId);
    return certId;
  }

  private async getLiveService() {
    const access = await this.getAccess<VolcengineAccess>(this.accessId);

    const client = new VolcengineClient({
      logger: this.logger,
      access,
      http: this.http,
    });

    return await client.getLiveService();
  }

  async onGetDomainList(data: any) {
    if (!this.accessId) {
      throw new Error("请选择Access授权");
    }
    const service = await this.getLiveService();

    const res = await service.request({
      action: "ListDomainDetail",
      body: {
        PageNum: 1,
        PageSize: 100,
      },
    });

    const list = res.Result?.DomainList;
    if (!list || list.length === 0) {
      throw new Error("找不到直播域名，您也可以手动输入域名");
    }
    const options = list.map((item: any) => {
      return {
        value: item.Domain,
        label: `${item.Domain}<${item.Type}>`,
        domain: item.Domain,
      };
    });
    return this.ctx.utils.options.buildGroupOptions(options, this.certDomains);
  }
}

new VolcengineDeployToLive();
