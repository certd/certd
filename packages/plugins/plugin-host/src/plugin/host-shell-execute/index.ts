import { Autowire, IAccessService, IsTaskPlugin, ILogger, RunStrategy, TaskInput, ITaskPlugin } from "@certd/pipeline";
import { SshClient } from "../../lib/ssh";
import { CertInfo } from "@certd/plugin-cert";

@IsTaskPlugin({
  name: "hostShellExecute",
  title: "执行远程主机脚本命令",
  input: {},
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
  output: {},
})
export class HostShellExecutePlugin implements ITaskPlugin {
  @TaskInput({
    title: "主机登录配置",
    helper: "登录",
    component: {
      name: "pi-access-selector",
      type: "ssh",
    },
    required: true,
  })
  accessId!: string;
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
    title: "shell脚本命令",
    component: {
      name: "a-textarea",
      vModel: "value",
    },
  })
  script!: string;

  @Autowire()
  accessService!: IAccessService;
  @Autowire()
  logger!: ILogger;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async onInstance() {}
  async execute(): Promise<void> {
    const { script, accessId } = this;
    const connectConf = this.accessService.getById(accessId);
    const sshClient = new SshClient(this.logger);
    const ret = await sshClient.exec({
      connectConf,
      script,
    });
    this.logger.info("exec res:", ret);
  }
}

new HostShellExecutePlugin();
