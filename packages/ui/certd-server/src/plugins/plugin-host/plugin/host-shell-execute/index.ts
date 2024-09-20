import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from '@certd/pipeline';
import { SshClient } from '../../lib/ssh.js';

@IsTaskPlugin({
  name: 'hostShellExecute',
  title: '执行远程主机脚本命令',
  icon: 'tabler:brand-powershell',
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
      rows: 6,
    },
    helper: '注意：如果目标主机是windows，且终端是cmd，系统会自动将多行命令通过“&&”连接成一行',
    required: true,
  })
  script!: string;

  async onInstance() {}
  async execute(): Promise<void> {
    const { script, accessId } = this;
    const connectConf = await this.accessService.getById(accessId);
    const sshClient = new SshClient(this.logger);

    const scripts = script.split('\n');
    await sshClient.exec({
      connectConf,
      script: scripts,
    });
    // this.logger.info('exec res:', ret);
  }
}

new HostShellExecutePlugin();
