import { AbstractTaskPlugin, IAccessService, IsTaskPlugin, RunStrategy, TaskInput, TaskOutput } from "@certd/pipeline";
import Core from "@alicloud/pop-core";
import { AliyunAccess } from "../../access";
import { appendTimeSuffix, checkRet, ZoneOptions } from "../../utils";
import { Logger } from "log4js";

@IsTaskPlugin({
  name: "uploadCertToAliyun",
  title: "上传证书到阿里云",
  desc: "",
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class UploadCertToAliyun extends AbstractTaskPlugin {
  @TaskInput({
    title: "证书名称",
    helper: "证书上传后将以此参数作为名称前缀",
  })
  name!: string;

  @TaskInput({
    title: "负载均衡监听id",
  })
  listenerId!: string;

  @TaskInput({
    title: "大区",
    value: "cn-hangzhou",
    component: {
      name: "a-select",
      vModel: "value",
      options: ZoneOptions,
    },
    required: true,
  })
  regionId!: string;

  @TaskInput({
    title: "域名证书",
    helper: "请选择前置任务输出的域名证书",
    component: {
      name: "pi-output-selector",
    },
    required: true,
  })
  cert!: any;

  @TaskInput({
    title: "Access授权",
    helper: "阿里云授权AccessKeyId、AccessKeySecret",
    component: {
      name: "pi-access-selector",
      type: "aliyun",
    },
    required: true,
  })
  accessId!: string;

  @TaskOutput({
    title: "上传成功后的阿里云CertId",
  })
  aliyunCertId!: string;

  accessService!: IAccessService;
  logger!: Logger;

  async onInstance() {
    this.accessService = this.ctx.accessService;
    this.logger = this.ctx.logger;
  }

  async execute(): Promise<void> {
    console.log("开始部署证书到阿里云cdn");
    const access = (await this.accessService.getById(this.accessId)) as AliyunAccess;
    const client = this.getClient(access);
    const certName = appendTimeSuffix(this.name);
    const params = {
      RegionId: this.regionId || "cn-hangzhou",
      Name: certName,
      Cert: this.cert.crt,
      Key: this.cert.key,
    };

    const requestOption = {
      method: "POST",
    };

    const ret = (await client.request("CreateUserCertificate", params, requestOption)) as any;
    checkRet(ret);
    this.logger.info("证书上传成功：aliyunCertId=", ret.CertId);

    //output
    this.aliyunCertId = ret.CertId;

    const lsRequestOption = {
      method: "POST",
    };

    const lsParams = {
      listenerId: this.listenerId,
      certificates: [ret.CertId],
    };

    const lsRet = (await client.request("AssociateAdditionalCertificatesWithListener", lsParams, lsRequestOption)) as any;
    checkRet(lsRet);
    this.logger.info("关联扩展证书和监听成功");
  }

  getClient(aliyunProvider: AliyunAccess) {
    return new Core({
      accessKeyId: aliyunProvider.accessKeyId,
      accessKeySecret: aliyunProvider.accessKeySecret,
      endpoint: "https://cas.aliyuncs.com",
      apiVersion: "2018-07-13",
    });
  }
}
//注册插件
new UploadCertToAliyun();
