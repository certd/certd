import { Autowire, IAccessService, IsTaskPlugin, ITaskPlugin, ILogger, RunStrategy, TaskInput, TaskOutput } from "@certd/pipeline";
import { SshClient } from "../../lib/ssh";
import { CertInfo } from "@certd/plugin-cert";
import * as fs from "fs";

@IsTaskPlugin({
  name: "uploadCertToHost",
  title: "上传证书到主机",
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class UploadCertToHostPlugin implements ITaskPlugin {
  @TaskInput({
    title: "证书保存路径",
  })
  crtPath!: string;
  @TaskInput({
    title: "私钥保存路径",
  })
  keyPath!: string;
  @TaskInput({
    title: "域名证书",
    helper: "请选择前置任务输出的域名证书",
    component: {
      name: "pi-output-selector",
    },
    required: true,
  })
  cert!: CertInfo;
  @TaskInput({
    title: "主机登录配置",
    helper: "access授权",
    component: {
      name: "pi-access-selector",
      type: "ssh",
    },
    rules: [{ required: true, message: "此项必填" }],
  })
  accessId!: string;
  @TaskInput({
    title: "是否sudo",
    component: {
      name: "a-checkbox",
      vModel: "checked",
    },
  })
  sudo!: boolean;

  @Autowire()
  accessService!: IAccessService;
  @Autowire()
  logger!: ILogger;

  @TaskOutput({
    title: "证书保存路径",
  })
  hostCrtPath!: string;

  @TaskOutput({
    title: "私钥保存路径",
  })
  hostKeyPath!: string;

  async onInstance() {}
  async execute(): Promise<void> {
    const { crtPath, keyPath, cert, accessId, sudo } = this;
    const connectConf = this.accessService.getById(accessId);
    const sshClient = new SshClient(this.logger);

    const saveCrtPath = cert.saveToFile("crt");
    const saveKeyPath = cert.saveToFile("key");

    await sshClient.uploadFiles({
      connectConf,
      transports: [
        {
          localPath: saveCrtPath,
          remotePath: crtPath,
        },
        {
          localPath: saveKeyPath,
          remotePath: keyPath,
        },
      ],
      sudo,
    });
    this.logger.info("证书上传成功：crtPath=", crtPath, ",keyPath=", keyPath);

    //删除临时文件
    fs.unlinkSync(saveCrtPath);
    fs.unlinkSync(saveKeyPath);

    //输出
    this.hostCrtPath = crtPath;
    this.hostKeyPath = keyPath;
  }
}

new UploadCertToHostPlugin();
