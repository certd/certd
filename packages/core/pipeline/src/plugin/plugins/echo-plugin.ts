import { AbstractPlugin } from "../abstract-plugin";
import { IsTask, TaskInput, TaskOutput, TaskPlugin } from "../api";

@IsTask(() => {
  return {
    name: "EchoPlugin",
    title: "测试插件【echo】",
    input: {
      cert: {
        title: "cert",
        component: {
          name: "pi-output-selector",
        },
        helper: "输出选择",
      },
    },
    output: {},
  };
})
export class EchoPlugin extends AbstractPlugin implements TaskPlugin {
  async execute(input: TaskInput): Promise<TaskOutput> {
    for (const key in input) {
      this.logger.info("input :", key, input[key]);
    }
    return input;
  }
}
