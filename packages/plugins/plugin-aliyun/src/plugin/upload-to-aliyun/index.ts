import { AbstractPlugin, IsTask, RunStrategy, TaskInput, TaskOutput, TaskPlugin } from "@certd/pipeline";
import dayjs from "dayjs";
import Core from "@alicloud/pop-core";
import RPCClient from "@alicloud/pop-core";
import { AliyunAccess } from "../../access";
import { appendTimeSuffix, checkRet, ZoneOptions } from "../../utils";

@IsTask(() => {
  return {
    name: "uploadCertToAliyun",
    title: "上传证书到阿里云",
    desc: "",
    input: {
      name: {
        title: "证书名称",
        helper: "证书上传后将以此参数作为名称前缀",
      },
      regionId: {
        title: "大区",
        value: "cn-hangzhou",
        component: {
          name: "a-select",
          vModel: "value",
          options: ZoneOptions,
        },
        required: true,
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
    output: {
      aliyunCertId: {
        title: "上传成功后的阿里云CertId",
      },
    },
    default: {
      strategy: {
        runStrategy: RunStrategy.SkipWhenSucceed,
      },
    },
  };
})
export class UploadCertToAliyun extends AbstractPlugin implements TaskPlugin {
  async execute(input: TaskInput): Promise<TaskOutput> {
    console.log("开始部署证书到阿里云cdn");
    const access = (await this.accessService.getById(input.accessId)) as AliyunAccess;
    const client = this.getClient(access);
    const { name, cert } = input;
    const certName = appendTimeSuffix(name);
    const params = {
      RegionId: input.regionId || "cn-hangzhou",
      Name: certName,
      Cert: cert.crt,
      Key: cert.key,
    };

    const requestOption = {
      method: "POST",
    };

    const ret = (await client.request("CreateUserCertificate", params, requestOption)) as any;
    checkRet(ret);
    this.logger.info("证书上传成功：aliyunCertId=", ret.CertId);
    return { aliyunCertId: ret.CertId };
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
