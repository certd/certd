import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";

import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { OnePanelAccess } from "../access.js";
import { CertReader, createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { OnePanelClient } from "../client.js";

@IsTaskPlugin({
  name: "1PanelDeployToPanel",
  title: "1Panel-部署面板证书",
  icon: "svg:icon-onepanel",
  desc: "更新1Panel的面板证书",
  group: pluginGroups.panel.key,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
  needPlus: false,
})
export class OnePanelDeployToPanelPlugin extends AbstractTaskPlugin {
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
      typeName: "OnePanelDeployToPanelPlugin",
      action: OnePanelDeployToPanelPlugin.prototype.onGetNodes.name,
      value: "local",
      required: true,
    })
  )
  currentNode!: string;

  @TaskInput({
    title: "SSL模式",
    helper: "SSL模式，只有2.1.x以上版本才支持，旧版本保持默认即可",
    component: {
      name: "a-select",
      vMode: "value",
      options: [
        { label: "启用SSL(旧版本)", value: "enable" },
        { label: "Strict模式(>=2.1.x)", value: "Enable" },
        { label: "Mux模式(>=2.1.x)", value: "Mux" },
      ],
    },
    value: "enable",
    required: true,
  })
  sslMode!: string;

  access: OnePanelAccess;
  async onInstance() {
    this.access = await this.getAccess(this.accessId);
  }
  //http://xxx:xxxx/1panel/swagger/index.html#/App/get_apps__key
  async execute(): Promise<void> {
    const client = new OnePanelClient({
      access: this.access,
      http: this.http,
      logger: this.logger,
      utils: this.ctx.utils,
    });

    const certReader = new CertReader(this.cert);
    const domain = certReader.getMainDomain();

    if (this.access.apiVersion === "v1") {
      const uploadRes = await client.doRequest({
        // api/v1/settings/ssl/update
        url: `/api/v1/settings/ssl/update`,
        method: "post",
        data: {
          cert: this.cert.crt,
          key: this.cert.key,
          domain: domain,
          ssl: "enable",
          sslID: null,
          sslType: "import-paste",
        },
        currentNode: this.currentNode,
      });
      console.log("uploadRes", JSON.stringify(uploadRes));
    } else {
      const uploadRes = await client.doRequest({
        // api/v2/core/settings/ssl/update
        url: `/api/v2/core/settings/ssl/update`,
        method: "post",
        data: {
          cert: this.cert.crt,
          key: this.cert.key,
          domain: domain,
          ssl: this.sslMode,
          sslID: null,
          sslType: "import-paste",
        },
        currentNode: this.currentNode,
      });
      console.log("uploadRes", JSON.stringify(uploadRes));
    }

    await this.ctx.utils.sleep(10000);
    this.logger.info(`证书更新完成`);
  }

  isNeedUpdate(certRes: any) {
    if (certRes.pem === this.cert.crt && certRes.key === this.cert.key) {
      this.logger.info(`证书(id:${certRes.id})已经是最新的了，不需要更新`);
      return false;
    }
    return true;
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
}
new OnePanelDeployToPanelPlugin();
