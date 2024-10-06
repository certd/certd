import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput, TaskInstanceContext } from '@certd/pipeline';
import { CertInfo, CertReader } from '@certd/plugin-cert';

export type CustomScriptContext = {
  CertReader: typeof CertReader;
  self: CustomScriptPlugin;
} & TaskInstanceContext;

@IsTaskPlugin({
  name: 'CustomScript',
  title: '自定义js脚本',
  icon: 'ri:javascript-line',
  desc: '【仅管理员】运行自定义js脚本执行',
  group: pluginGroups.other.key,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class CustomScriptPlugin extends AbstractTaskPlugin {
  @TaskInput({
    title: '脚本',
    helper: '自定义js脚本',
    component: {
      name: 'a-textarea',
      vModel: 'value',
      rows: 10,
      style: 'background-color: #000c17;color: #fafafa;',
    },
    required: true,
  })
  script!: string;

  @TaskInput({
    title: '域名证书',
    helper: '请选择前置任务输出的域名证书',
    component: {
      name: 'output-selector',
      from: ['CertApply', 'CertApplyLego'],
    },
    required: false,
  })
  cert!: CertInfo;

  async onInstance() {}
  async execute(): Promise<void> {
    if (!this.isAdmin()) {
      throw new Error('只有管理员才能运行此任务');
    }
    this.logger.info('执行自定义脚本:\n', this.script);
    const ctx: CustomScriptContext = {
      CertReader,
      self: this,
      ...this.ctx,
    };
    const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
    const func = new AsyncFunction('ctx', this.script);
    return await func(ctx);
  }
}
new CustomScriptPlugin();
