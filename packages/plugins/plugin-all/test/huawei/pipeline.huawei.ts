import { ConcurrencyStrategy, NextStrategy, Pipeline, RunStrategy } from "@certd/pipeline";

let idIndex = 0;
function generateId() {
  idIndex++;
  return idIndex + "";
}
export const pipeline: Pipeline = {
  version: 1,
  id: "huawei.test",
  title: "华为管道测试",
  userId: 1,
  triggers: [],
  stages: [
    {
      id: generateId(),
      title: "证书申请阶段",
      concurrency: ConcurrencyStrategy.Serial,
      next: NextStrategy.AllSuccess,
      tasks: [
        {
          id: generateId(),
          title: "申请证书任务",
          steps: [
            {
              id: generateId(),
              title: "申请证书",
              type: "CertApply",
              input: {
                domains: ["powerleader.chat", "*.powerleader.chat", "*.test.powerleader.chat", "*.ai.powerleader.chat"],
                email: "xiaojunnuo@qq.com",
                dnsProviderType: "huawei",
                accessId: "333",
              },
              strategy: {
                runStrategy: RunStrategy.SkipWhenSucceed,
              },
            },
          ],
        },
      ],
    },
    {
      id: generateId(),
      title: "证书部署阶段",
      concurrency: ConcurrencyStrategy.Serial,
      next: NextStrategy.AllSuccess,
      tasks: [
        {
          id: generateId(),
          title: "测试输出参数任务",
          steps: [
            {
              id: generateId(),
              title: "输出参数（echo插件）",
              type: "EchoPlugin",
              input: {
                cert: "cert",
              },
              strategy: {
                runStrategy: RunStrategy.SkipWhenSucceed,
              },
            },
          ],
        },
      ],
    },
  ],
};
