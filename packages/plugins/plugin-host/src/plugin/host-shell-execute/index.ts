import { IsTask, TaskInput, TaskOutput, TaskPlugin, AbstractPlugin, RunStrategy } from "@certd/pipeline";
import { SshClient } from "../../lib/ssh";

@IsTask(() => {
  return {
    name: "hostShellExecute",
    title: "执行远程主机脚本命令",
    input: {
      accessId: {
        title: "主机登录配置",
        helper: "登录",
        component: {
          name: "pi-access-selector",
          type: "ssh",
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
      script: {
        title: "shell脚本命令",
        component: {
          name: "a-textarea",
          vModel: "value",
        },
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
export class HostShellExecutePlugin extends AbstractPlugin implements TaskPlugin {
  async execute(input: TaskInput): Promise<TaskOutput> {
    const { script, accessId } = input;
    const connectConf = this.accessService.getById(accessId);
    const sshClient = new SshClient(this.logger);
    const ret = await sshClient.exec({
      connectConf,
      script,
    });
    this.logger.info("exec res:", ret);
    return {};
  }
}
