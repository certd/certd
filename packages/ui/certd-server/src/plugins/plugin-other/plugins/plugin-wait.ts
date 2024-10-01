import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from '@certd/pipeline';

@IsTaskPlugin({
  name: 'WaitPlugin',
  title: '等待',
  icon: 'ri:rest-time-line',
  desc: '等待一段时间',
  group: pluginGroups.other.key,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class WaitPlugin extends AbstractTaskPlugin {
  @TaskInput({
    title: '等待时长',
    value: 30,
    component: {
      name: 'a-input-number',
      vModel: 'value',
    },
    helper: '单位：秒',
    required: true,
  })
  waitTime!: number;

  async onInstance() {}
  async execute(): Promise<void> {
    this.logger.info(`等待${this.waitTime}s`);
    await this.ctx.utils.sleep(this.waitTime * 1000);
    this.logger.info('等待结束');
  }
}
new WaitPlugin();
