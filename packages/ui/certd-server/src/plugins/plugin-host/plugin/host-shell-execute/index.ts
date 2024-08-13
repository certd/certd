import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from '@certd/pipeline';
import { SshClient } from '../../lib/ssh.js';

@IsTaskPlugin({
  name: 'hostShellExecute',
  title: '执行远程主机脚本命令',
  group: pluginGroups.host.key,
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
    title: '主机登录配置',
    helper: '登录',
    component: {
      name: 'pi-access-selector',
      type: 'ssh',
    },
    required: true,
  })
  accessId!: string;
  @TaskInput({
    title: 'shell脚本命令',
    component: {
      name: 'a-textarea',
      vModel: 'value',
    },
    required: true,
  })
  script!: string;

  async onInstance() {}
  async execute(): Promise<void> {
    const { script, accessId } = this;
    const connectConf = await this.accessService.getById(accessId);
    const sshClient = new SshClient(this.logger);
    const ret = await sshClient.exec({
      connectConf,
      script,
    });
    this.logger.info('exec res:', ret);
  }
}

new HostShellExecutePlugin();
