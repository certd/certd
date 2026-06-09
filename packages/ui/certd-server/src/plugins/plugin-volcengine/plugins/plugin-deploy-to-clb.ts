import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { VolcengineAccess } from "../access.js";
import { VolcengineClient } from "../ve-client.js";

@IsTaskPlugin({
  name: "VolcengineDeployToCLB",
  title: "火山引擎-部署证书至CLB",
  icon: "svg:icon-volcengine",
  group: pluginGroups.volcengine.key,
  desc: "部署至火山引擎负载均衡",
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class VolcengineDeployToCLB extends AbstractTaskPlugin {
  @TaskInput({
    title: "域名证书",
    helper: "请选择前置任务输出的域名证书",
    component: {
      name: "output-selector",
      from: [...CertApplyPluginNames, "VolcengineUploadToCertCenter"],
    },
    required: true,
  })
  cert!: CertInfo | string;

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

  @TaskInput({
    title: "Region",
    helper: "地区选择",
    component: {
      name: "a-select",
      options: [
        /**
         * 中国地区
         * 华北2
         * 北京
         * cn-beijing
         * 4
         * 可用区A：cn-beijing-a
         * 可用区B：cn-beijing-b
         * 可用区C：cn-beijing-c
         * 可用区D：cn-beijing-d
         * 商用
         * 华东2
         * 上海
         * cn-shanghai
         * 4
         * 可用区A：cn-shanghai-a
         * 可用区B：cn-shanghai-b
         * 可用区C：cn-shanghai-c
         * 可用区E：cn-shanghai-e
         * 商用
         * 华南1
         * 广州
         * cn-guangzhou
         * 3
         * 可用区A：cn-guangzhou-a
         * 可用区B：cn-guangzhou-b
         * 可用区C：cn-guangzhou-c
         * 商用
         * 中国香港
         * 香港
         * cn-hongkong
         * 2
         * 可用区A：cn-hongkong-a
         * 可用区B：cn-hongkong-b
         * 商用
         * 其他国家和地区
         * 亚太东南
         * 柔佛
         * ap-southeast-1
         * 2
         * 可用区A：ap-southeast-1a
         * 可用区B：ap-southeast-1b
         * 商用
         * 雅加达
         * ap-southeast-3
         * 2
         * 可用区A：ap-southeast-3a
         * 可用区B：ap-southeast-3b
         * 商用
         */
        { label: "北京", value: "cn-beijing" },
        { label: "上海", value: "cn-shanghai" },
        { label: "广州", value: "cn-guangzhou" },
        { label: "深圳", value: "cn-shenzhen" },
        { label: "杭州", value: "cn-hangzhou" },
        { label: "南京", value: "cn-north-1" },
        { label: "青岛", value: "cn-qingdao" },
        { label: "重庆", value: "cn-chengdu" },
        { label: "香港", value: "cn-hongkong" },
        { label: "柔佛", value: "ap-southeast-1" },
        { label: "雅加达", value: "ap-southeast-3" },
      ],
    },
    value: "cn-beijing",
    required: true,
  })
  regionId!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "监听器列表",
      helper: "选择要部署证书的监听器\n<span class='color-blue'>需要在监听器中选择证书中心，进行跨服务访问授权</span>",
      action: VolcengineDeployToCLB.prototype.onGetListenerList.name,
      watches: ["certDomains", "accessId", "regionId"],
      required: true,
    })
  )
  listenerList!: string | string[];

  async onInstance() {}

  async execute(): Promise<void> {
    this.logger.info("开始部署证书到火山引擎CLB");
    const access = await this.getAccess<VolcengineAccess>(this.accessId);
    const certService = await this.getCertService(access);
    let certId = this.cert;
    if (typeof certId !== "string") {
      const certInfo = this.cert as CertInfo;
      this.logger.info(`开始上传证书`);
      certId = await certService.ImportCertificate({
        certName: this.appendTimeSuffix("certd"),
        cert: certInfo,
      });
      this.logger.info(`上传证书成功:${certId}`);
    } else {
      this.logger.info(`使用已有证书ID:${certId}`);
    }

    const service = await this.getClbService();
    for (const listener of this.listenerList) {
      this.logger.info(`开始部署监听器${listener}证书`);
      await service.request({
        action: "ModifyListenerAttributes",
        query: {
          ListenerId: listener,
          CertificateSource: "cert_center",
          CertCenterCertificateId: certId,
        },
      });
      this.logger.info(`部署监听器${listener}证书成功`);
    }

    this.logger.info("部署完成");
  }

  private async getCertService(access: VolcengineAccess) {
    const client = new VolcengineClient({
      logger: this.logger,
      access,
      http: this.http,
    });

    return await client.getCertCenterService();
  }

  async onGetClbList(data: any) {
    if (!this.accessId) {
      throw new Error("请选择Access授权");
    }
    const service = await this.getClbService();
    const res = await service.request({
      action: "DescribeLoadBalancers",
      method: "GET",
      query: {
        PageSize: 100,
      },
    });

    const list = res.Result.LoadBalancers;

    return list.map((item: any) => {
      return {
        value: item.LoadBalancerId,
        label: `${item.LoadBalancerName}<${item.Description}>`,
      };
    });
  }

  private async getClbService() {
    const access = await this.getAccess<VolcengineAccess>(this.accessId);

    const client = new VolcengineClient({
      logger: this.logger,
      access,
      http: this.http,
    });

    const service = await client.getClbService({
      region: this.regionId,
    });
    return service;
  }

  async onGetListenerList(data: any) {
    if (!this.accessId) {
      throw new Error("请选择Access授权");
    }
    const service = await this.getClbService();

    const res = await service.request({
      action: "DescribeListeners",
      method: "GET",
      query: {
        PageSize: 100,
        Protocol: "HTTPS",
      },
    });

    const list = res.Result.Listeners;
    if (!list || list.length === 0) {
      throw new Error("找不到HTTPS类型的负载均衡监听器，您也可以手动输入监听器ID");
    }
    return list.map((item: any) => {
      return {
        value: item.ListenerId,
        label: `${item.ListenerName}<${item.Description}:${item.ListenerId}>`,
      };
    });
  }
}

new VolcengineDeployToCLB();
