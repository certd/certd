import { Autowire, IsTaskPlugin, TaskInput, ITaskPlugin } from "@certd/pipeline";

@IsTaskPlugin({
  name: "EchoPlugin",
  title: "测试插件",
  desc: "test",
})
export class EchoPlugin implements ITaskPlugin {
  @TaskInput({
    title: "测试属性",
    component: {
      name: "text",
    },
  })
  test?: string;

  async execute(): Promise<void> {
    console.log("output", this.test);
  }

  onInstance(): Promise<void> {
    return Promise.resolve(undefined);
  }
}
new EchoPlugin();
