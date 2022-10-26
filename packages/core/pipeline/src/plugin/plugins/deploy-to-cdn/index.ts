import { AbstractPlugin } from "../../abstract-plugin";
import { IsTask, TaskInput, TaskOutput, TaskPlugin } from "../../api";
import dayjs from "dayjs";
import Core from "@alicloud/pop-core";
import RPCClient from "@alicloud/pop-core";
import { AliyunAccess } from "../../../access";
import { CertInfo } from "../cert-plugin";

@IsTask(() => {
  return {
    name: "DeployCertToAliyunCDN",
    title: "部署证书至阿里云CDN",
    input: {
      domainName: {
        title: "cdn加速域名",
        component: {
          placeholder: "cdn加速域名",
        },
        required: true,
      },
      certName: {
        title: "证书名称",
        component: {
          placeholder: "上传后将以此名称作为前缀",
        },
      },
      cert: {
        title: "域名证书",
        helper: "请选择前置任务输出的域名证书",
        component: {
          name: "output-selector",
        },
        required: true,
      },
      accessId: {
        title: "Access提供者",
        helper: "access授权",
        component: {
          name: "access-selector",
          type: "aliyun",
        },
        required: true,
      },
    },
    output: {},
  };
})
export class DeployCertToAliyunCDN extends AbstractPlugin implements TaskPlugin {
  constructor() {
    super();
  }

  async execute(input: TaskInput): Promise<TaskOutput> {
    console.log("开始部署证书到阿里云cdn");
    const access = this.accessService.getById(input.accessId) as AliyunAccess;
    const client = this.getClient(access);
    const params = await this.buildParams(input);
    await this.doRequest(client, params);
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
    const { certName, domainName, cert } = input;
    const CertName = certName + "-" + dayjs().format("YYYYMMDDHHmmss");

    const newCert = (await this.pipelineContext.get(cert)) as CertInfo;
    return {
      RegionId: "cn-hangzhou",
      DomainName: domainName,
      ServerCertificateStatus: "on",
      CertName: CertName,
      CertType: "upload",
      ServerCertificate: newCert.crt,
      PrivateKey: newCert.key,
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
      throw new Error("执行失败：", ret.Message);
    }
  }
}
