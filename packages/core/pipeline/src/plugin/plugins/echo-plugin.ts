import { AbstractPlugin } from "../abstract-plugin";
import { IsTask, TaskInput, TaskOutput, TaskPlugin } from "../api";

@IsTask(() => {
  return {
    name: "EchoPlugin",
    title: "测试插件回声",
    input: {
      cert: {
        component: {
          name: "output-selector",
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
      console.log("input :", key, input[key]);
    }
    return input;
  }
}
