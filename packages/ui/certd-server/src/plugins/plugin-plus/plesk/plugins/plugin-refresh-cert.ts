import { IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo, CertReader } from "@certd/plugin-cert";
import { AbstractPlusTaskPlugin } from "@certd/plugin-plus";
import { PleskAccess } from "../access.js";
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import FormData from "form-data";

@IsTaskPlugin({
  name: "PleskRefreshCert",
  title: "Plesk-更新证书",
  icon: "svg:icon-plesk",
  desc: "不会创建新证书记录，直接更新旧的证书",
  group: pluginGroups.panel.key,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
  needPlus: true,
})
export class PleskRefreshCert extends AbstractPlusTaskPlugin {
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

  @TaskInput(createCertDomainGetterInputDefine({ props: { required: false } }))
  certDomains!: string[];

  //授权选择框
  @TaskInput({
    title: "Plesk授权",
    component: {
      name: "access-selector",
      type: "plesk",
    },
    required: true,
  })
  accessId!: string;

  //测试参数
  @TaskInput(
    createRemoteSelectInputDefine({
      title: "证书列表",
      helper: "选择要更新的站点域名，注意域名是否与证书匹配",
      action: PleskRefreshCert.prototype.onGetCertList.name,
    })
  )
  domainCertIds!: string[];

  async execute(): Promise<void> {
    const access = await this.getAccess<PleskAccess>(this.accessId);
    //get cookie
    const sessionId = await access.getSessionId();

    const { token } = await access.getCertList(sessionId);

    const certReader = new CertReader(this.cert);
    for (const certIds of this.domainCertIds) {
      const [domainId, certId] = certIds.split("_")[0];
      const formData = new FormData();
      formData.append("name", this.buildCertName(certReader.getMainDomain()));
      formData.append("type", "sendText");
      formData.append("uploadText[certificateText]", this.cert.crt);
      formData.append("uploadText[privateKeyText]", this.cert.key); // 这里没用
      formData.append("forgery_protection_token", token);

      const res = await access.doEditRequest({
        url: `/smb/ssl-certificate/edit/id/${domainId}/certificateId/${certId}`,
        sessionId,
        token,
        formData,
        checkRes: false,
      });

      this.logger.info(`更新证书成功：${certIds}_${certReader.getMainDomain()}`, res);
    }

    this.logger.info(`部署证书完成`);
  }

  async onGetCertList(data: any) {
    if (!this.accessId) {
      throw new Error("请选择Access授权");
    }

    const access = await this.getAccess<PleskAccess>(this.accessId);

    const sessionId = await access.getSessionId();

    const { list } = await access.getCertList(sessionId);

    if (!list || list.length === 0) {
      throw new Error("没有找到证书");
    }
    const options = list.map((item: any) => {
      return {
        label: `${item.domainName}(${item.domainId}_${item.certificateId})`,
        value: `${item.domainId}_${item.certificateId}`,
        domain: item.domainName,
      };
    });
    return this.ctx.utils.options.buildGroupOptions(options, this.certDomains);
  }
}

new PleskRefreshCert();
