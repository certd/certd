import { ITaskPlugin } from "../api.js";
import { IsTaskPlugin, TaskInput } from "../decorator.js";

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

  onInstance(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async execute(): Promise<void> {
    return Promise.resolve(undefined);
  }
}
