import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput, TaskInstanceContext } from "@certd/pipeline";
import { CertInfo, CertReader } from "@certd/plugin-cert";
import { CertApplyPluginNames } from "@certd/plugin-cert";
export type CustomScriptContext = {
  CertReader: typeof CertReader;
  self: CustomScriptPlugin;
} & TaskInstanceContext;

@IsTaskPlugin({
  name: "CustomScript",
  title: "自定义js脚本",
  icon: "ri:javascript-line",
  desc: "【仅管理员】运行自定义js脚本执行",
  group: pluginGroups.admin.key,
  showRunStrategy: true,
  onlyAdmin: true,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class CustomScriptPlugin extends AbstractTaskPlugin {
  @TaskInput({
    title: "脚本",
    helper: "自定义js脚本，[脚本编写帮助文档](https://certd.docmirror.cn/guide/use/custom-script/)",
    component: {
      name: "a-textarea",
      vModel: "value",
      rows: 10,
      style: "background-color: #000c17;color: #fafafa;",
    },
    required: true,
  })
  script!: string;

  @TaskInput({
    title: "域名证书",
    helper: "请选择前置任务输出的域名证书",
    component: {
      name: "output-selector",
      from: [...CertApplyPluginNames],
    },
    required: false,
  })
  cert!: CertInfo;

  async onInstance() {}
  async execute(): Promise<void> {
    this.checkAdmin();
    this.logger.info("执行自定义脚本:\n", this.script);
    const ctx: CustomScriptContext = {
      CertReader,
      self: this,
      ...this.ctx,
    };
    const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
    const func = new AsyncFunction("ctx", this.script);
    return await func(ctx);
  }
}
new CustomScriptPlugin();
