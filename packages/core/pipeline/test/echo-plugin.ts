import { IsTaskPlugin, TaskInput, ITaskPlugin, ILogger, Autowire, TaskOutput } from "../src";

@IsTaskPlugin({
  name: "EchoPlugin",
  title: "测试插件【echo】",
})
export class EchoPlugin implements ITaskPlugin {
  @TaskInput({
    title: "cert",
    component: {
      name: "pi-output-selector",
    },
    helper: "输出选择",
  })
  cert!: any;

  @Autowire()
  logger!: ILogger;

  @TaskOutput({
    title: "cert info",
  })
  certInfo!: any;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async onInit(): Promise<void> {}
  async execute(): Promise<void> {
    console.log("input :cert", this.cert);
  }
}
