import { IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { AbstractPlusTaskPlugin } from "@certd/plugin-plus";
import { PleskAccess } from "../access.js";
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import FormData from "form-data";

@IsTaskPlugin({
  name: "PleskDeploySiteCert",
  title: "Plesk-部署Plesk网站证书",
  icon: "svg:icon-plesk",
  group: pluginGroups.panel.key,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
  needPlus: true,
})
export class PleskDeploySiteCert extends AbstractPlusTaskPlugin {
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
      title: "网站域名列表",
      helper: "选择要更新的站点域名，注意域名是否与证书匹配",
      action: PleskDeploySiteCert.prototype.onGetDomainList.name,
    })
  )
  siteDomainIds!: number[];

  @TaskInput({
    title: "删除未使用证书",
    component: {
      name: "a-switch",
      vModel: "checked",
    },
    required: false,
  })
  clearUnused!: boolean;

  async execute(): Promise<void> {
    const access = await this.getAccess<PleskAccess>(this.accessId);
    //get cookie
    const sessionId = await access.getSessionId();

    for (const siteDomainId of this.siteDomainIds) {
      const formData = new FormData();
      formData.append("id", siteDomainId);
      formData.append("fileContent", this.cert.one);
      formData.append("fileName", "cert.pem");

      const detail = await access.doGetRequest({
        //https://vps-b6941c0f.vps.ovh.net:8443/modules/sslit/index.php/index/certificate/id/2
        url: `/modules/sslit/index.php/index/certificate/id/${siteDomainId}`,
        sessionId,
      });
      //获取防伪令牌
      // <meta name="forgery_protection_token" id="forgery_protection_token" content="0206c10e5c19c9cbc3ea89ccd485822a">
      const token = access.getTokenFromDetail(detail);

      await access.doEditRequest({
        url: `/modules/sslit/index.php/index/upload/`,
        sessionId,
        token,
        formData,
      });
      this.logger.info(`部署站点<${siteDomainId}>证书成功`);

      //删除未使用的证书
      if (this.clearUnused) {
        await this.ctx.utils.sleep(3000);
        this.logger.info(`开始删除未使用的证书`);
        try {
          await access.deleteUnusedCert({ sessionId, token, siteDomainId });
        } catch (e) {
          this.logger.warn(`删除未使用的证书失败:${e.message}`);
        }
      }
    }

    this.logger.info(`部署证书完成`);
  }

  async onGetDomainList(data: any) {
    if (!this.accessId) {
      throw new Error("请选择Access授权");
    }

    const access = await this.getAccess<PleskAccess>(this.accessId);

    const res = await this.http.request({
      url: `/api/v2/domains`,
      baseURL: access.url,
      method: "get",
      headers: {
        // authorization: Basic =='
        Authorization: `Basic ${Buffer.from(`${access.username}:${access.password}`).toString("base64")}`,
      },
    });

    if (!res || res.length === 0) {
      throw new Error("没有找站点域名");
    }
    const options = res.map((item: any) => {
      return {
        label: item.name,
        value: item.id,
        domain: item.name,
      };
    });
    return this.ctx.utils.options.buildGroupOptions(options, this.certDomains);
  }
}

new PleskDeploySiteCert();
