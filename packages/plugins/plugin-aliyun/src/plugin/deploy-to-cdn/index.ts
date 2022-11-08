import { AbstractPlugin, IsTask, RunStrategy, TaskInput, TaskOutput, TaskPlugin } from "@certd/pipeline";
import dayjs from "dayjs";
import Core from "@alicloud/pop-core";
import RPCClient from "@alicloud/pop-core";
import { AliyunAccess } from "../../access";

@IsTask(() => {
  return {
    name: "DeployCertToAliyunCDN",
    title: "部署证书至阿里云CDN",
    desc: "依赖证书申请前置任务，自动部署域名证书至阿里云CDN",
    input: {
      domainName: {
        title: "CDN加速域名",
        helper: "你在阿里云上配置的CDN加速域名，比如certd.docmirror.cn",
        required: true,
      },
      certName: {
        title: "证书名称",
        helper: "上传后将以此名称作为前缀备注",
      },
      cert: {
        title: "域名证书",
        helper: "请选择前置任务输出的域名证书",
        component: {
          name: "pi-output-selector",
        },
        required: true,
      },
      accessId: {
        title: "Access授权",
        helper: "阿里云授权AccessKeyId、AccessKeySecret",
        component: {
          name: "pi-access-selector",
          type: "aliyun",
        },
        required: true,
      },
    },
    output: {},
    default: {
      strategy: {
        runStrategy: RunStrategy.SkipWhenSucceed,
      },
    },
  };
})
export class DeployCertToAliyunCDN extends AbstractPlugin implements TaskPlugin {
  async execute(input: TaskInput): Promise<TaskOutput> {
    console.log("开始部署证书到阿里云cdn");
    const access = (await this.accessService.getById(input.accessId)) as AliyunAccess;
    const client = this.getClient(access);
    const params = await this.buildParams(input);
    await this.doRequest(client, params);
    console.log("部署完成");
    return {};
  }

  getClient(access: AliyunAccess) {
    return new Core({
      accessKeyId: access.accessKeyId,
      accessKeySecret: access.accessKeySecret,
      endpoint: "https://cdn.aliyuncs.com",
      apiVersion: "2018-05-10",
    });
  }

  async buildParams(input: TaskInput) {
    const { certName, domainName } = input;
    const CertName = (certName ?? "certd") + "-" + dayjs().format("YYYYMMDDHHmmss");
    const cert = input.cert;
    return {
      RegionId: "cn-hangzhou",
      DomainName: domainName,
      ServerCertificateStatus: "on",
      CertName: CertName,
      CertType: "upload",
      ServerCertificate: cert.crt,
      PrivateKey: cert.key,
    };
  }

  async doRequest(client: RPCClient, params: any) {
    const requestOption = {
      method: "POST",
    };
    const ret: any = await client.request("SetDomainServerCertificate", params, requestOption);
    this.checkRet(ret);
    this.logger.info("设置cdn证书成功:", ret.RequestId);
  }

  checkRet(ret: any) {
    if (ret.code != null) {
      throw new Error("执行失败：" + ret.Message);
    }
  }
}
