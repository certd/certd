import { AbstractPlugin, IsTask, RunStrategy, TaskInput, TaskOutput, TaskPlugin } from "@certd/pipeline";
import tencentcloud from "tencentcloud-sdk-nodejs/index";
import { TencentAccess } from "../../access";

@IsTask(() => {
  return {
    name: "DeployCertToTencentCDN",
    title: "部署到腾讯云CDN",
    input: {
      domainName: {
        title: "cdn加速域名",
        rules: [{ required: true, message: "该项必填" }],
      },
      certName: {
        title: "证书名称",
        helper: "证书上传后将以此参数作为名称前缀",
      },
      cert: {
        title: "域名证书",
        helper: "请选择前置任务输出的域名证书",
        component: {
          name: "pi-output-selector",
          from: "CertApply",
        },
        required: true,
      },
      accessId: {
        title: "Access提供者",
        helper: "access 授权",
        component: {
          name: "pi-access-selector",
          type: "tencent",
        },
        required: true,
      },
    },
    default: {
      strategy: {
        runStrategy: RunStrategy.SkipWhenSucceed,
      },
    },
    output: {},
  };
})
export class DeployToCdnPlugin extends AbstractPlugin implements TaskPlugin {
  async execute(input: TaskInput): Promise<TaskOutput> {
    const { cert, accessId } = input;
    const accessProvider: TencentAccess = (await this.accessService.getById(accessId)) as TencentAccess;
    const client = this.getClient(accessProvider);
    const params = this.buildParams(input, cert);
    await this.doRequest(client, params);

    return {};
  }

  getClient(accessProvider: TencentAccess) {
    const CdnClient = tencentcloud.cdn.v20180606.Client;

    const clientConfig = {
      credential: {
        secretId: accessProvider.secretId,
        secretKey: accessProvider.secretKey,
      },
      region: "",
      profile: {
        httpProfile: {
          endpoint: "cdn.tencentcloudapi.com",
        },
      },
    };

    return new CdnClient(clientConfig);
  }

  buildParams(props: TaskInput, cert: any) {
    const { domainName } = props;
    return {
      Https: {
        Switch: "on",
        CertInfo: {
          Certificate: cert.crt,
          PrivateKey: cert.key,
        },
      },
      Domain: domainName,
    };
  }

  async doRequest(client: any, params: any) {
    const ret = await client.UpdateDomainConfig(params);
    this.checkRet(ret);
    this.logger.info("设置腾讯云CDN证书成功:", ret.RequestId);
    return ret.RequestId;
  }

  checkRet(ret: any) {
    if (!ret || ret.Error) {
      throw new Error("执行失败：" + ret.Error.Code + "," + ret.Error.Message);
    }
  }
}
