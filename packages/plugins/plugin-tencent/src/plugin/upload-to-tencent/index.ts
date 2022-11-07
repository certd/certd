import { AbstractPlugin, IsTask, RunStrategy, TaskInput, TaskOutput, TaskPlugin } from "@certd/pipeline";
import tencentcloud from "tencentcloud-sdk-nodejs/index";
import dayjs from "dayjs";

@IsTask(() => {
  return {
    name: "UploadCertToTencent",
    title: "上传证书到腾讯云",
    desc: "上传成功后输出：tencentCertId",
    input: {
      name: {
        title: "证书名称",
      },
      accessId: {
        title: "Access授权",
        helper: "access授权",
        component: {
          name: "pi-access-selector",
          type: "tencent",
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
    },
    default: {
      strategy: {
        runStrategy: RunStrategy.SkipWhenSucceed,
      },
    },
    output: {
      tencentCertId: {
        title: "上传成功后的腾讯云CertId",
      },
    },
  };
})
export class UploadToTencentPlugin extends AbstractPlugin implements TaskPlugin {
  async execute(input: TaskInput): Promise<TaskOutput> {
    const { accessId, name, cert } = input;
    const accessProvider = this.accessService.getById(accessId);
    const certName = this.appendTimeSuffix(name || cert.domain);
    const client = this.getClient(accessProvider);

    const params = {
      CertificatePublicKey: cert.crt,
      CertificatePrivateKey: cert.key,
      Alias: certName,
    };
    const ret = await client.UploadCertificate(params);
    this.checkRet(ret);
    this.logger.info("证书上传成功：tencentCertId=", ret.CertificateId);
    return { tencentCertId: ret.CertificateId };
  }

  appendTimeSuffix(name: string) {
    if (name == null) {
      name = "certd";
    }
    return name + "-" + dayjs().format("YYYYMMDD-HHmmss");
  }

  getClient(accessProvider: any) {
    const SslClient = tencentcloud.ssl.v20191205.Client;

    const clientConfig = {
      credential: {
        secretId: accessProvider.secretId,
        secretKey: accessProvider.secretKey,
      },
      region: "",
      profile: {
        httpProfile: {
          endpoint: "ssl.tencentcloudapi.com",
        },
      },
    };

    return new SslClient(clientConfig);
  }

  // async rollback({ input }) {
  //   const { accessId } = input;
  //   const accessProvider = this.accessService.getById(accessId);
  //   const client = this.getClient(accessProvider);
  //
  //   const { tencentCertId } = context;
  //   const params = {
  //     CertificateId: tencentCertId,
  //   };
  //   const ret = await client.DeleteCertificate(params);
  //   this.checkRet(ret);
  //   this.logger.info("证书删除成功：DeleteResult=", ret.DeleteResult);
  //   delete context.tencentCertId;
  // }
  checkRet(ret: any) {
    if (!ret || ret.Error) {
      throw new Error("执行失败：" + ret.Error.Code + "," + ret.Error.Message);
    }
  }
}
