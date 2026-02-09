import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { AliyunAccess } from "../../../plugin-lib/aliyun/access/index.js";
import { AliyunSslClient, CasCertId } from "../../../plugin-lib/aliyun/lib/ssl-client.js";

@IsTaskPlugin({
  name: "AliyunDeployCertToAll",
  title: "阿里云-部署至任意云资源",
  icon: "svg:icon-aliyun",
  group: pluginGroups.aliyun.key,
  desc: "【不建议使用】需要消耗阿里云自动部署次数，支持SLB、LIVE、webHosting、VOD、CR、DCDN、DDoS、CDN、ALB、APIGateway、FC、GA、MSE、NLB、OSS、SAE、WAF等云产品",
  needPlus: false,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class AliyunDeployCertToAll extends AbstractTaskPlugin {
  @TaskInput({
    title: "域名证书",
    helper: "请选择证书申请任务输出的域名证书\n或者选择前置任务“上传证书到阿里云”任务的证书ID，可以减少上传到阿里云的证书数量",
    component: {
      name: "output-selector",
      from: [...CertApplyPluginNames, "uploadCertToAliyun"],
    },
    required: true,
  })
  cert!: CertInfo | CasCertId | number;

  @TaskInput(createCertDomainGetterInputDefine({ props: { required: false } }))
  certDomains!: string[];

  @TaskInput({
    title: "接入点",
    helper: "不会选就按默认",
    value: "cas.aliyuncs.com",
    component: {
      name: "a-select",
      options: [
        { value: "cas.aliyuncs.com", label: "中国大陆" },
        { value: "cas.ap-southeast-1.aliyuncs.com", label: "新加坡" },
        { value: "cas.eu-central-1.aliyuncs.com", label: "德国（法兰克福）" },
      ],
    },
    required: true,
  })
  endpoint!: string;

  @TaskInput({
    title: "Access授权",
    helper: "阿里云授权AccessKeyId、AccessKeySecret",
    component: {
      name: "access-selector",
      type: "aliyun",
    },
    required: true,
  })
  accessId!: string;

  /**
   * SLB：传统型负载均衡 CLB（仅中国站）
   * LIVE：视频直播（仅中国站）
   * webHosting：云虚拟主机（仅中国站）
   * VOD：视频点播（仅中国站）
   * CR：容器镜像服务（仅中国站）
   * DCDN：全站加速
   * DDoS：DDos 防护
   * CDN：内容分发网络
   * ALB：应用负载均衡
   * APIGateway：API 网关
   * FC：函数计算
   * GA：全球加速
   * MSE：微服务引擎
   * NLB：网络型负载均衡
   * OSS：对象存储
   * SAE：Serverless 应用引擎
   * WAF：Web 应用防火墙
   */
  @TaskInput({
    title: "云产品类型",
    helper: "请选择云产品类型",
    component: {
      name: "a-select",
      vModel: "value",
      options: [
        { value: "SLB", label: "SLB-传统型负载均衡 CLB（仅中国站）" },
        { value: "LIVE", label: "LIVE-视频直播（仅中国站）" },
        { value: "webHosting", label: "webHosting-云虚拟主机（仅中国站）" },
        { value: "VOD", label: "VOD-视频点播（仅中国站）" },
        { value: "CR", label: "CR-容器镜像服务（仅中国站）" },
        { value: "DCDN", label: "DCDN-全站加速" },
        { value: "DDoS", label: "DDos 防护" },
        { value: "CDN", label: "CDN-内容分发网络" },
        { value: "ALB", label: "ALB-应用负载均衡" },
        { value: "APIGateway", label: "APIGateway-API 网关" },
        { value: "FC", label: "FC-函数计算" },
        { value: "GA", label: "GA-全球加速" },
        { value: "MSE", label: "MSE-微服务引擎" },
        { value: "NLB", label: "NLB-网络型负载均衡" },
        { value: "OSS", label: "OSS-对象存储" },
        { value: "SAE", label: "SAE-Serverless应用引擎" },
        { value: "WAF", label: "WAF-Web应用防火墙" },
      ],
    },
    required: true,
  })
  cloudProduct!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "要部署证书的云产品",
      helper: "请选择要部署证书的云产品，注意：新创建的云产品资源可能需要过1-2小时才会在此处显示",
      typeName: "AliyunDeployCertToAll",
      action: AliyunDeployCertToAll.prototype.onGetProductList.name,
      watches: ["cloudProduct", "accessId"],
    })
  )
  productIds!: string[];

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "联系人",
      helper: "请选择联系人,如果没有，需要先到[阿里云控制台创建联系人](https://yundun.console.aliyun.com/?p=cas#/informationManagement/person/)",
      typeName: "AliyunDeployCertToAll",
      action: AliyunDeployCertToAll.prototype.onGetContactList.name,
    })
  )
  contactIds!: string[];

  @TaskInput({
    title: "检查超时时间",
    helper: "检查部署任务超时时间,单位分钟",
    value: 10,
    component: {
      name: "a-input-number",
      vModel: "value",
    },
    required: true,
  })
  checkTimeout!: number;

  async onInstance() {}

  async execute(): Promise<void> {
    this.logger.info("开始部署证书到阿里云");
    const access = await this.getAccess<AliyunAccess>(this.accessId);
    const sslClient = new AliyunSslClient({
      access,
      logger: this.logger,
      endpoint: this.endpoint,
    });

    //
    let certId: any = this.cert;
    if (typeof this.cert === "object") {
      const certInfo = this.cert as CertInfo;
      const casCert = this.cert as CasCertId;
      if (casCert.certId) {
        certId = casCert.certId;
      } else {
        const certIdRes = await sslClient.uploadCertificate({
          name: this.appendTimeSuffix("certd"),
          cert: certInfo,
        });
        certId = certIdRes.certId as any;
      }
    }

    const jobId = await this.createDeployJob(sslClient, certId);

    await this.updateJobStatus(sslClient, jobId, "scheduling");

    this.logger.info("开始检查部署任务执行结果");
    const startTime = Date.now();
    while (Date.now() < startTime + this.checkTimeout * 60 * 1000) {
      this.checkSignal();
      await this.ctx.utils.sleep(10000);
      let res: any = {};
      try {
        res = await this.getJobDetail(sslClient, jobId);
      } catch (e: any) {
        this.logger.error(e);
        break;
      }
      const status = res.Status;
      if (status == "success") {
        this.logger.info("部署任务执行成功：", status);
        return;
      } else if (status == "error") {
        this.logger.error(`部署任务执行失败，请前往 https://yundun.console.aliyun.com/?p=cas#/deployDetail/user/${jobId} 查看失败原因： `, res);

        throw new Error("部署任务执行失败，");
      } else {
        /**
         * pending：待执行
         * editing：编辑中
         * scheduling：调度中
         * processing：部署中
         * error：部署失败
         * success：部署成功
         */
        this.logger.info("部署任务正在执行中: ", status);
      }
    }

    throw new Error("部署任务执行超时,请手动检查任务状态");
  }

  async updateJobStatus(sslClient: AliyunSslClient, jobId: string, status: string) {
    const params = {
      JobId: jobId,
      Status: status,
    };
    const requestOption = {
      method: "POST",
      formatParams: false,
    };
    const res = await sslClient.doRequest("UpdateDeploymentJobStatus", params, requestOption);
    this.logger.info("部署任务开始执行，部署需要时间,RequestId=", res.RequestId);
  }

  async onGetProductList(data: any) {
    if (!this.accessId) {
      throw new Error("请选择Access授权");
    }
    const access = await this.getAccess<AliyunAccess>(this.accessId);
    const sslClient = new AliyunSslClient({
      access,
      logger: this.logger,
      endpoint: this.endpoint,
    });

    if (!this.cloudProduct) {
      throw new Error("请选择云产品类型");
    }

    const res = await sslClient.getResourceList({
      cloudProduct: this.cloudProduct,
    });
    if (!res?.Data || res?.Data.length === 0) {
      throw new Error("没有找到对应类型的云资源");
    }
    const options = res.Data.map((item: any) => {
      return {
        label: `${item.Domain}<${item.Id}>`,
        value: item.Id,
        title: `${item.CloudProduct}:${item.CertName || "证书未命名"}`,
        domain: item.Domain,
      };
    });
    return this.ctx.utils.options.buildGroupOptions(options, this.certDomains);
  }

  async onGetContactList(data: any) {
    if (!this.accessId) {
      throw new Error("请选择Access授权");
    }
    const access = await this.getAccess<AliyunAccess>(this.accessId);
    const sslClient = new AliyunSslClient({
      access,
      logger: this.logger,
      endpoint: this.endpoint,
    });
    const res = await sslClient.getContactList();
    /*
          "Email": "@qq.com",
      "EmailStatus": 0,
      "MobileStatus": 0,
      "ContactId": 378992,
      "Mobile": "",
      "Name": ""
         */
    if (!res?.ContactList || res?.ContactList.length === 0) {
      throw new Error("没有找到联系人");
    }
    return res.ContactList.map((item: any) => {
      return {
        label: `${item.Name}<${item.Email}:${item.ContactId}>`,
        value: item.ContactId,
      };
    });
  }

  async getJobDetail(sslClient: AliyunSslClient, jobId: number) {
    const params = {
      JobId: jobId,
    };

    const requestOption = {
      method: "POST",
      formatParams: false,
    };

    return await sslClient.doRequest("DescribeDeploymentJob", params, requestOption);
  }

  private async createDeployJob(sslClient: AliyunSslClient, certId: any) {
    const res = await sslClient.createDeploymentJob({
      name: "自动部署证书(By Certd)",
      jobType: "user",
      contactIds: this.contactIds,
      resourceIds: this.productIds,
      certIds: [certId],
    });

    const jobId = res.JobId;
    this.logger.info("部署任务创建成功: jobId=", jobId);
    return jobId;
  }
}

new AliyunDeployCertToAll();
