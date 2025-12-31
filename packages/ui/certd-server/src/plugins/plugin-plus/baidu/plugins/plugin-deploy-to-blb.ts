import { AbstractTaskPlugin, IsTaskPlugin, PageSearch, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo, CertReader } from "@certd/plugin-cert";
import { createCertDomainGetterInputDefine } from "@certd/plugin-lib";
import { BaiduYunCertClient, BaiduYunClient } from "../client.js";

@IsTaskPlugin({
  name: "BaiduDeployToBLB",
  title: "百度云-部署证书到负载均衡",
  icon: "ant-design:baidu-outlined",
  group: pluginGroups.baidu.key,
  desc: "部署到百度云负载均衡，包括BLB、APPBLB",
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
  needPlus: false,
})
export class BaiduDeployToBLBPlugin extends AbstractTaskPlugin {
  //证书选择，此项必须要有
  @TaskInput({
    title: "域名证书",
    helper: "请选择前置任务输出的域名证书",
    component: {
      name: "output-selector",
      from: [...CertApplyPluginNames, "BaiduUploadCert"],
    },
    required: true,
  })
  cert!: CertInfo | string;

  @TaskInput(createCertDomainGetterInputDefine())
  certDomains!: string[];

  @TaskInput({
    title: "区域",
    component: {
      name: "a-select",
      vModel: "value",
      options: [
        /**
         * 北京	blb.bj.baidubce.com	HTTP/HTTPS
         * 广州	blb.gz.baidubce.com	HTTP/HTTPS
         * 苏州	blb.su.baidubce.com	HTTP/HTTPS
         * 香港	blb.hkg.baidubce.com	HTTP/HTTPS
         * 武汉	blb.fwh.baidubce.com	HTTP/HTTPS
         * 保定	blb.bd.baidubce.com	HTTP/HTTPS
         * 上海	blb.fsh.baidubce.com	HTTP/HTTPS
         * 新加坡	blb.sin.baidubce.com	HTTP/HTTPS
         */
        { value: "bj", label: "北京" },
        { value: "fsh", label: "上海" },
        { value: "gz", label: "广州" },
        { value: "fwh", label: "武汉" },
        { value: "su", label: "苏州" },
        { value: "bd", label: "保定" },
        { value: "hkg", label: "香港" },
        { value: "sin", label: "新加坡" },
      ],
    },
    required: true,
  })
  region!: string;

  @TaskInput({
    title: "负载均衡类型",
    component: {
      name: "a-select",
      vModel: "value",
      options: [
        { value: "blb", label: "普通负载均衡" },
        { value: "appblb", label: "应用负载均衡" },
      ],
    },
    required: true,
  })
  blbType!: string;

  //授权选择框
  @TaskInput({
    title: "百度云授权",
    helper: "百度云授权",
    component: {
      name: "access-selector",
      type: "baidu",
    },
    required: true,
  })
  accessId!: string;

  @TaskInput({
    title: "负载均衡ID",
    component: {
      name: "remote-select",
      vModel: "value",
      mode: "tags",
      action: "GetBLBList",
      watches: ["certDomains", "blbType", "accessId"],
    },
    required: true,
  })
  blbIds!: string[];

  @TaskInput({
    title: "监听器ID",
    component: {
      name: "remote-select",
      vModel: "value",
      mode: "tags",
      action: "GetListenerList",
      watches: ["certDomains", "accessId", "blbIds"],
    },
    required: true,
  })
  listenerIds!: string[];

  async onInstance() {}

  async execute(): Promise<void> {
    this.logger.info("开始更新百度云监听器证书");
    const access = await this.getAccess(this.accessId);
    const certClient = new BaiduYunCertClient({
      access,
      logger: this.logger,
      http: this.ctx.http,
    });

    let certId = this.cert as string;
    if (typeof this.cert !== "string") {
      this.logger.info("上传证书到百度云");
      const res = await certClient.createCert({
        cert: this.cert,
        certName: CertReader.buildCertName(this.cert),
      });
      certId = res.certId;
      this.logger.info(`上传证书到百度云成功:${certId}`);
    }

    const baiduyunClient = new BaiduYunClient({
      access,
      logger: this.logger,
      http: this.ctx.http,
    });
    for (const listenerId of this.listenerIds) {
      const listenerParams = listenerId.split("_");
      const blbId = listenerParams[0];
      const listenerType = listenerParams[1];
      const listenerPort = listenerParams[2];
      let additionalCertHost = null;
      if (listenerParams.length > 3) {
        additionalCertHost = listenerParams[3];
      }
      this.logger.info(`更新监听器证书开始:${listenerId}`);
      if (!additionalCertHost) {
        await this.updateListenerCert({
          client: baiduyunClient,
          blbId,
          listenerType,
          listenerPort,
          certId,
        });
      } else {
        const listenerDomains = await this.getListeners(baiduyunClient, blbId, listenerType, listenerPort);
        if (!listenerDomains || listenerDomains.length === 0) {
          throw new Error(`未找到监听器:${listenerId}`);
        }
        const oldAdditionals = listenerDomains[0].additionalCertDomains;
        for (const oldAddi of oldAdditionals) {
          if (oldAddi.host === additionalCertHost) {
            oldAddi.certId = certId;
          }
        }
        await this.updateListenerCert({
          client: baiduyunClient,
          blbId,
          listenerType,
          listenerPort,
          certId,
          additionalCertDomains: oldAdditionals,
        });
      }
      this.logger.info(`更新监听器证书成功:${listenerId}`);
      await this.ctx.utils.sleep(3000);
    }

    this.logger.info(`更新百度云监听器证书完成`);
  }

  async onGetListenerList(data: PageSearch = {}) {
    const access = await this.getAccess(this.accessId);
    const client = new BaiduYunClient({
      access,
      logger: this.logger,
      http: this.ctx.http,
    });

    const listeners = [];
    for (const blbId of this.blbIds) {
      /**
       * GET /v{version}/appblb/{blbId}/TCPlistener?listenerPort={listenerPort}&marker={marker}&maxKeys={maxKeys} HTTP/1.1
       * Host: blb.bj.baidubce.com
       */
      const listenerTypes = ["HTTPSlistener", "SSLlistener"];
      for (const listenerType of listenerTypes) {
        const list = await this.getListeners(client, blbId, listenerType);
        if (list && list.length > 0) {
          for (const item of list) {
            const key = `${blbId}_${listenerType}_${item.listenerPort}`;
            listeners.push({
              value: key,
              label: key,
            });

            if (item.additionalCertDomains && item.additionalCertDomains.length > 0) {
              for (const addi of item.additionalCertDomains) {
                const addiKey = `${key}_${addi.host}`;
                listeners.push({
                  value: addiKey,
                  label: `${addiKey}【扩展】`,
                });
              }
            }
          }
        }
      }
    }

    if (!listeners || listeners.length === 0) {
      throw new Error("未找到https/SSL监听器");
    }
    return listeners;
  }

  private async getListeners(client: BaiduYunClient, blbId: string, listenerType: string, listenerPort?: number | string) {
    const query: any = {
      maxItems: 1000,
    };
    if (listenerPort) {
      query.listenerPort = listenerPort;
    }
    const res = await client.doRequest({
      host: `blb.${this.region}.baidubce.com`,
      uri: `/v1/${this.blbType}/${blbId}/${listenerType}`,
      method: "GET",
      query,
    });
    return res.listenerList;
  }

  async onGetBLBList(data: PageSearch = {}) {
    const access = await this.getAccess(this.accessId);
    const client = new BaiduYunClient({
      access,
      logger: this.logger,
      http: this.ctx.http,
    });

    /**
     * GET /v{version}/appblb?address={address}&name={name}&blbId={blbId}&marker={marker}&maxKeys={maxKeys} HTTP/1.1
     * Host: blb.bj.baidubce.com
     */
    const res = await client.doRequest({
      host: `blb.${this.region}.baidubce.com`,
      uri: `/v1/${this.blbType}`,
      method: "GET",
      query: {
        maxItems: 1000,
      },
    });

    const list = res.blbList;

    if (!list || list.length === 0) {
      throw new Error("没有数据，你可以手动输入");
    }
    const options: any[] = [];
    for (const item of list) {
      options.push({
        value: item.blbId,
        label: item.name,
      });
    }
    return options;
  }

  private async updateListenerCert(param: { client: BaiduYunClient; blbId: string; listenerType: string; listenerPort: string; certId?: any; additionalCertDomains?: any[] }) {
    /**
     * PUT /v{version}/appblb/{blbId}/SSLlistener?clientToken={clientToken}&listenerPort={listenerPort} HTTP/1.1
     * Host: blb.bj.baidubce.com
     * Authorization: authorization string
     *
     * {
     *     "scheduler":scheduler,
     *     "certIds":[certId],
     *     "encryptionType":encryptionType,
     *     "encryptionProtocols":[protocol1, protacol2],
     *     "dualAuth":false,
     *     "clientCertIds":[clientCertId],
     *     "description":description
     * }
     */
    const { client, blbId, listenerType, listenerPort, certId, additionalCertDomains } = param;
    const body: any = {};
    if (additionalCertDomains) {
      body.additionalCertDomains = additionalCertDomains;
    }
    if (certId) {
      body.certIds = [certId];
    }
    const res = await client.doRequest({
      host: `blb.${this.region}.baidubce.com`,
      uri: `/v1/${this.blbType}/${blbId}/${listenerType}`,
      method: "PUT",
      query: {
        listenerPort,
      },
      body,
    });
    return res;
  }
}

new BaiduDeployToBLBPlugin();
