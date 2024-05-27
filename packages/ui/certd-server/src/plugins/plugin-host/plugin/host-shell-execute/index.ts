import { AbstractTaskPlugin, IAccessService, ILogger, IsTaskPlugin, RunStrategy, TaskInput } from "@certd/pipeline";
import { SshClient } from "../../lib/ssh";

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
export class HostShellExecutePlugin extends AbstractTaskPlugin {
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
    title: "shell脚本命令",
    component: {
      name: "a-textarea",
      vModel: "value",
    },
  })
  script!: string;

  accessService!: IAccessService;
  logger!: ILogger;
  async onInstance() {
    this.accessService = this.ctx.accessService;
    this.logger = this.ctx.logger;
  }
  async execute(): Promise<void> {
    const { script, accessId } = this;
    const connectConf = await this.accessService.getById(accessId);
    const sshClient = new SshClient(this.logger);
    const ret = await sshClient.exec({
      connectConf,
      script,
    });
    this.logger.info("exec res:", ret);
  }
}

new HostShellExecutePlugin();
