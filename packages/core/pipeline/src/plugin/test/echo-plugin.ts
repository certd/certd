import { ILogger } from "@midwayjs/logger";
import { ITaskPlugin } from "../api";
import { Autowire, IsTaskPlugin, TaskInput } from "../decorator";

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

  @Autowire()
  // @ts-ignore
  logger: ILogger;

  async execute(): Promise<void> {
    return Promise.resolve(undefined);
  }
}
