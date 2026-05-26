import { AbstractTaskPlugin, IsTaskPlugin, Pager, PageSearch, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import {
  createCertDomainGetterInputDefine,
  createRemoteSelectInputDefine
} from "@certd/plugin-lib";
import { AliyunAccess } from "../../../plugin-lib/aliyun/access/index.js";
import { AliyunSslClient, CasCertId } from "../../../plugin-lib/aliyun/lib/ssl-client.js";

@IsTaskPlugin({
  name: "AliyunDeployCertToGA",
  title: "阿里云-部署至GA",
  icon: "svg:icon-aliyun",
  group: pluginGroups.aliyun.key,
  desc: "部署证书到阿里云GA(全球加速)，支持更新默认证书和扩展证书",
  needPlus: false,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed
    }
  }
})
export class AliyunDeployCertToGA extends AbstractTaskPlugin {
  @TaskInput({
    title: "域名证书",
    helper: "请选择证书申请任务输出的域名证书",
    component: {
      name: "output-selector",
      from: [...CertApplyPluginNames, 'uploadCertToAliyun']
    },
    required: true
  })
  cert!: CertInfo|number | CasCertId;

  @TaskInput(createCertDomainGetterInputDefine({ props: { required: false } }))
  certDomains!: string[];

  @TaskInput({
    title: "证书接入点",
    helper: "不会选就保持默认即可",
    value: "cas.aliyuncs.com",
    component: {
      name: "a-select",
      options: [
        { value: "cas.aliyuncs.com", label: "中国大陆" },
        { value: "cas.ap-southeast-1.aliyuncs.com", label: "新加坡" }
      ]
    },
    required: true
  })
  casEndpoint!: string;

  @TaskInput({
    title: "Access授权",
    helper: "阿里云授权AccessKeyId、AccessKeySecret",
    component: {
      name: "access-selector",
      type: "aliyun"
    },
    required: true
  })
  accessId!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "全球加速实例",
      helper: "请选择要部署证书的全球加速实例",
      action: AliyunDeployCertToGA.prototype.onGetAcceleratorList.name,
      watches: ["accessId"],
      single: true,
    })
  )
  acceleratorId!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "监听",
      helper: "请选择要部署证书的监听",
      action: AliyunDeployCertToGA.prototype.onGetListenerList.name,
      watches: ["accessId", "acceleratorId"]
    })
  )
  listenerIds!: string[];

  @TaskInput({
    title: "证书类型",
    helper: "选择更新默认证书还是扩展证书",
    value: "default",
    component: {
      name: "a-select",
      options: [
        { value: "default", label: "默认证书" },
        { value: "additional", label: "扩展证书" }
      ]
    },
    required: true,
  })
  certType!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "扩展证书域名",
      helper: "将证书里的域名扩展绑定到监听器中",
      action: AliyunDeployCertToGA.prototype.onGetAdditionalDomainList.name,
      watches: ["accessId", "acceleratorId", "listenerIds", "certType"],
      mergeScript: `
        return {
          show: ctx.compute(({form})=>{
            return form.certType === "additional";
          })
        }
    `
    })
  )
  additionalDomains!: string[];

  async onInstance() {
  }

  async getAliyunCertId(access: AliyunAccess) {
    const sslClient = new AliyunSslClient({
      access,
      logger: this.logger,
      endpoint: this.casEndpoint
    });
    return await sslClient.uploadCertOrGet(this.cert as any)
  }

  async execute(): Promise<void> {
    this.logger.info("开始部署证书到阿里云GA");
    const access = await this.getAccess<AliyunAccess>(this.accessId);

    const client = await this.getClient(access);

    const { certIdentifier } = await this.getAliyunCertId(access);
    
    for (const listenerId of this.listenerIds) {
      if (this.certType === "default") {
        // 更新默认证书
        this.logger.info(`开始更新默认证书到实例[${this.acceleratorId}]监听[${listenerId}]`);
        const res = await client.doRequest({
          action: "UpdateListener",
          version: "2019-11-20",
          data: {
            query: {
              RegionId: "cn-hangzhou",
              AcceleratorId: this.acceleratorId,
              ListenerId: listenerId,
              Certificates: [
               { Id: certIdentifier},
              ]
            }
          }
        });
        this.logger.info(`部署默认证书到实例[${this.acceleratorId}]监听[${listenerId}]成功：${JSON.stringify(res)}`);
      } else if (this.certType === "additional") {
        // 处理扩展证书
        for (const domain of this.additionalDomains) {
          // 先检查域名是否已存在
          this.logger.info(`开始检查域名[${domain}]是否已存在于实例[${this.acceleratorId}]监听[${listenerId}]`);
          const existingCerts = await client.doRequest({
            action: "ListListenerCertificates",
            version: "2019-11-20",
            method: "GET",
            data: {
              query: {
                RegionId: "cn-hangzhou",
                AcceleratorId: this.acceleratorId,
                ListenerId: listenerId
              }
            }
          });

          const domainExists = existingCerts.Certificates?.some((cert: any) =>
            cert.Domain === domain
          );

          if (domainExists) {
            // 更新扩展证书
            this.logger.info(`域名[${domain}]已存在，开始更新扩展证书到实例[${this.acceleratorId}]监听[${listenerId}]`);
            const res = await client.doRequest({
              action: "UpdateAdditionalCertificateWithListener",
              version: "2019-11-20",
              data: {
                query: {
                  RegionId: "cn-hangzhou",
                  AcceleratorId: this.acceleratorId,
                  ListenerId: listenerId,
                  Domain: domain,
                  CertificateId: certIdentifier
                }
              }
            });
            this.logger.info(`更新扩展证书到实例[${this.acceleratorId}]监听[${listenerId}]域名[${domain}]成功：${JSON.stringify(res)}`);
          } else {
            // 新增扩展证书绑定
            this.logger.info(`域名[${domain}]不存在，开始新增扩展证书绑定到实例[${this.acceleratorId}]监听[${listenerId}]`);
            const res = await client.doRequest({
              action: "AssociateAdditionalCertificatesWithListener",
              version: "2019-11-20",
              data: {
                query: {
                  RegionId: "cn-hangzhou",
                  AcceleratorId: this.acceleratorId,
                  ListenerId: listenerId,
                  Certificates: [{
                    Id: certIdentifier,
                    Domain: domain
                  }]
                }
              }
            });
            this.logger.info(`新增扩展证书绑定到实例[${this.acceleratorId}]监听[${listenerId}]域名[${domain}]成功：${JSON.stringify(res)}`);
          }
        }
      }
      await this.ctx.utils.sleep(3000);
    }
  }

  async getClient(access: AliyunAccess) {
    const endpoint = `ga.cn-hangzhou.aliyuncs.com`;
    return access.getClient(endpoint);
  }

  async onGetAcceleratorList(data: PageSearch) {
    if (!this.accessId) {
      throw new Error("请选择Access授权");
    }

    const pager = new Pager(data)
    pager.pageSize = 50
    const access = await this.getAccess<AliyunAccess>(this.accessId);

    const client = await this.getClient(access);
    const res = await client.doRequest({
      action: "ListAccelerators",
      version: "2019-11-20",
      method: "GET",
      data: {
        query: {
          RegionId: "cn-hangzhou",
          PageNumber: pager.pageNo,
          PageSize: pager.pageSize,
          State: "active"
        }
      }
    });

    const list = res?.Accelerators;
    if (!list || list.length === 0) {
      throw new Error("没有找到全球加速实例，请先创建实例");
    }

    const options = list.map((item: any) => {
      const label = `${item.Name} (${item.AcceleratorId})`
      return {
        label: label,
        value: item.AcceleratorId,
      };
    });
    return options;
  }

  async onGetListenerList(data: any) {
    if (!this.accessId) {
      throw new Error("请选择Access授权");
    }
    if (!this.acceleratorId) {
      throw new Error("请先选择全球加速实例");
    }
    const access = await this.getAccess<AliyunAccess>(this.accessId);

    const client = await this.getClient(access);
    const res = await client.doRequest({
      action: "ListListeners",
      version: "2019-11-20",
      method: "GET",
      data: {
        query: {
          RegionId: "cn-hangzhou",
          AcceleratorId: this.acceleratorId
        }
      }
    });

    const listeners = res?.Listeners;
    if (!listeners || listeners.length === 0) {
      throw new Error("没有找到监听，请先创建监听");
    }

    const options = listeners.map((item: any) => {
      return {
        label: `${item.ListenerId} (${item.Protocol}})`,
        value: item.ListenerId,
      };
    });

    return options;
  }

  async onGetAdditionalDomainList(data: any) {
    if (!this.accessId) {
      throw new Error("请选择Access授权");
    }
    if (!this.acceleratorId) {
      throw new Error("请先选择全球加速实例");
    }
    if (!this.listenerIds || this.listenerIds.length === 0) {
      throw new Error("请先选择监听");
    }
    if (this.certType !== "additional") {
      throw new Error("请选择扩展证书类型");
    }

    // 获取当前监听已绑定的证书域名
    const list = this.certDomains || [];

    const options = list.map((item: any) => {
      return {
        label: item,
        value: item,
        domain: item,
      };
    });
    return options;
  }
}

new AliyunDeployCertToGA();