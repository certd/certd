import { IsTask, TaskInput, TaskOutput, TaskPlugin, AbstractPlugin, RunStrategy } from "@certd/pipeline";
import { SshClient } from "../../lib/ssh";

@IsTask(() => {
  return {
    name: "uploadCertToHost",
    title: "上传证书到主机",
    input: {
      crtPath: {
        title: "证书保存路径",
      },
      keyPath: {
        title: "私钥保存路径",
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
        title: "主机登录配置",
        helper: "access授权",
        component: {
          name: "pi-access-selector",
          type: "ssh",
        },
        rules: [{ required: true, message: "此项必填" }],
      },
      sudo: {
        title: "是否sudo",
        component: {
          name: "a-checkbox",
          vModel: "checked",
        },
      },
    },
    default: {
      strategy: {
        runStrategy: RunStrategy.SkipWhenSucceed,
      },
    },
    output: {
      hostCrtPath: {
        title: "上传成功后的证书路径",
      },
      hostKeyPath: {
        title: "上传成功后的私钥路径",
      },
    },
  };
})
export class UploadCertToHostPlugin extends AbstractPlugin implements TaskPlugin {
  async execute(input: TaskInput): Promise<TaskOutput> {
    const { crtPath, keyPath, cert, accessId, sudo } = input;
    const connectConf = this.accessService.getById(accessId);
    const sshClient = new SshClient(this.logger);
    await sshClient.uploadFiles({
      connectConf,
      transports: [
        {
          localPath: cert.crtPath,
          remotePath: crtPath,
        },
        {
          localPath: cert.keyPath,
          remotePath: keyPath,
        },
      ],
      sudo,
    });
    this.logger.info("证书上传成功：crtPath=", crtPath, ",keyPath=", keyPath);

    return {
      hostCrtPath: crtPath,
      hostKeyPath: keyPath,
    };
  }
}
