import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";

import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { OnePanelAccess } from "../access.js";
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { OnePanelClient } from "../client.js";

@IsTaskPlugin({
  name: "1PanelDeployToWebsitePlugin",
  title: "1Panel-部署证书到1Panel",
  icon: "svg:icon-onepanel",
  desc: "更新1Panel的证书",
  group: pluginGroups.panel.key,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
  needPlus: false,
})
export class OnePanelDeployToWebsitePlugin extends AbstractTaskPlugin {
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

  @TaskInput(createCertDomainGetterInputDefine())
  certDomains!: string[];

  //授权选择框
  @TaskInput({
    title: "1Panel授权",
    helper: "1Panel授权",
    component: {
      name: "access-selector",
      type: "1panel",
    },
    required: true,
  })
  accessId!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "1Panel节点",
      helper: "要更新的1Panel证书的节点信息，目前只有v2存在此概念",
      typeName: "OnePanelDeployToWebsitePlugin",
      action: OnePanelDeployToWebsitePlugin.prototype.onGetNodes.name,
      value: "local",
      required: true,
    })
  )
  currentNode!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "1Panel证书ID",
      typeName: "1PanelDeployToWebsitePlugin",
      action: OnePanelDeployToWebsitePlugin.prototype.onGetSSLIds.name,
      watches: ["accessId"],
      helper: "要更新的1Panel证书id，选择授权之后，从下拉框中选择\nIP需要加白名单，如果是同一台机器部署的，可以试试172.16.0.0/12",
      required: true,
    })
  )
  sslIds!: string[];

  access: OnePanelAccess;
  async onInstance() {
    this.access = await this.getAccess(this.accessId);
  }
  //http://xxx:xxxx/1panel/swagger/index.html#/App/get_apps__key
  async execute(): Promise<void> {
    //login 获取token
    /**
     * curl 'http://127.0.0.1:7001/api/v1/auth/login'  --data-binary '{"name":"admin_test","password":"admin_test1234","ignoreCaptcha":true,"captcha":"","captchaID":"nY8Cqeut3TjZMfJMAz0k","authMethod":"jwt","language":"zh"}' -H 'EntranceCode: emhhbmd5eg=='
     * curl 'http://127.0.0.1:7001/api/v1/dashboard/current/all/all' -H 'PanelAuthorization: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJJRCI6MCwiTmFtZSI6ImFkbWluX3Rlc3QiLCJCdWZmZXJUaW1lIjozNjAwLCJpc3MiOiIxUGFuZWwiLCJleHAiOjE3MDkyODg4MDl9.pdknJdjLY4Fp8wCE9Gvaiic2rLoSdvUSJB9ossyya_I'
     */

    const client = new OnePanelClient({
      access: this.access,
      http: this.http,
      logger: this.logger,
      utils: this.ctx.utils,
    });

    const sslIds = this.sslIds;
    for (const sslId of sslIds) {
      try {
        const certRes = await this.get1PanelCertInfo(client, sslId);
        if (!this.isNeedUpdate(certRes)) {
          continue;
        }

        const uploadRes = await client.doRequest({
          url: `/api/${this.access.apiVersion}/websites/ssl/upload`,
          method: "post",
          data: {
            sslIds,
            certificate: this.cert.crt,
            certificatePath: "",
            description: certRes.description || this.appendTimeSuffix("certd"),
            privateKey: this.cert.key,
            privateKeyPath: "",
            sslID: sslId,
            type: "paste",
          },
          currentNode: this.currentNode,
        });
        console.log("uploadRes", JSON.stringify(uploadRes));
      } catch (e) {
        this.logger.warn(`更新证书(id:${sslId})失败`, e);
        this.logger.info("可能1Panel正在重启，等待10秒后检查证书是否更新成功");
        await this.ctx.utils.sleep(10000);
        const certRes = await this.get1PanelCertInfo(client, sslId);
        if (!this.isNeedUpdate(certRes)) {
          continue;
        }
        throw e;
      }
    }
  }

  isNeedUpdate(certRes: any) {
    if (certRes.pem === this.cert.crt && certRes.key === this.cert.key) {
      this.logger.info(`证书(id:${certRes.id})已经是最新的了，不需要更新`);
      return false;
    }
    return true;
  }

  async get1PanelCertInfo(client: OnePanelClient, sslId: string) {
    const certRes = await client.doRequest({
      url: `/api/${this.access.apiVersion}/websites/ssl/${sslId}`,
      method: "get",
      currentNode: this.currentNode,
    });
    if (!certRes) {
      throw new Error(`没有找到证书(id:${sslId})，请先在1Panel中手动上传证书，后续才可以自动更新`);
    }
    return certRes;
  }

  async onGetNodes() {
    const options = [{ label: "主节点", value: "local" }];
    if (this.access.apiVersion === "v1") {
      return options;
    }
    if (!this.access) {
      throw new Error("请先选择授权");
    }
    const client = new OnePanelClient({
      access: this.access,
      http: this.http,
      logger: this.logger,
      utils: this.ctx.utils,
    });

    const resp = await client.doRequest({
      url: `/api/${this.access.apiVersion}/core/nodes/list`,
      method: "post",
      data: {},
    });

    // console.log('resp', resp)
    return [...options, ...(resp?.map(item => ({ label: `${item.addr}(${item.name})`, value: item.name })) || [])];
  }

  // requestHandle
  async onGetSSLIds() {
    // if (!isPlus()) {
    //   throw new Error("自动获取站点列表为专业版功能，您可以手动输入证书id进行部署");
    // }
    if (!this.access) {
      throw new Error("请先选择授权");
    }
    const client = new OnePanelClient({
      access: this.access,
      http: this.http,
      logger: this.logger,
      utils: this.ctx.utils,
    });
    const res = await client.doRequest({
      url: `api/${this.access.apiVersion}/websites/ssl/search`,
      method: "post",
      data: {
        page: 1,
        pageSize: 99999,
      },
      currentNode: this.currentNode,
    });
    if (!res?.items) {
      throw new Error("没有找到证书，请先在1Panel中手动上传证书，并关联站点，后续才可以自动更新");
    }
    const list = res.items.map(item => {
      const domains = item.domains ? [] : item.domains.split(",");
      const allDomains = [item.primaryDomain, ...domains];
      return {
        label: `${item.primaryDomain}<${item.id},${item.description || "无备注"}>`,
        value: item.id,
        domain: allDomains,
      };
    });
    return this.ctx.utils.options.buildGroupOptions(list, this.certDomains);
  }
}
new OnePanelDeployToWebsitePlugin();
