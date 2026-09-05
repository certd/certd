import assert from "assert";
import { Executor } from "./executor.js";
import { RunHistory, RunnableCollection } from "./run-history.js";
import { AbstractTaskPlugin, IsTaskPlugin, TaskInput, TaskOutput } from "../plugin/index.js";
import { AfterTask, Pipeline, ResultType } from "../dt/index.js";

/**
 * 测试用后置任务插件：记录执行时的输入与流水线结果
 */
@IsTaskPlugin({
  name: "TestAfterTaskPlugin",
  title: "测试后置任务插件",
  supportAfterTask: true,
})
class TestAfterTaskPlugin extends AbstractTaskPlugin {
  static calls: { message: string; pipelineResult: ResultType | undefined }[] = [];
  @TaskInput({ title: "消息" })
  message: string = "";

  async execute() {
    TestAfterTaskPlugin.calls.push({
      message: this.message,
      pipelineResult: this.pipelineResult,
    });
  }
}

/**
 * 测试用失败插件：execute 直接抛错
 */
@IsTaskPlugin({
  name: "TestAfterTaskFailPlugin",
  title: "测试失败插件",
  supportAfterTask: true,
})
class TestAfterTaskFailPlugin extends AbstractTaskPlugin {
  async execute() {
    throw new Error("模拟后置任务失败");
  }
}
// 通过类型字符串引用（插件注册由装饰器完成）
void TestAfterTaskFailPlugin;

/**
 * 测试用跳过插件：execute 写入输出属性后返回 skip（模拟申请证书插件证书未过期时跳过）
 */
@IsTaskPlugin({
  name: "TestSkipOutputPlugin",
  title: "测试跳过输出插件",
})
class TestSkipOutputPlugin extends AbstractTaskPlugin {
  @TaskOutput({ title: "证书" })
  cert: any;

  async execute() {
    this.cert = { crt: "mock-crt", key: "mock-key" };
    return "skip";
  }
}
void TestSkipOutputPlugin;

function createPipeline(afterTasks?: AfterTask[]): Pipeline {
  return {
    id: 1,
    title: "测试流水线",
    userId: 1,
    stages: [],
    afterTasks,
  } as any;
}

function createExecutor(pipeline: Pipeline): Executor {
  const executor = new Executor({
    pipeline,
    storage: {} as any,
    onChanged: async () => {},
    onFinished: async () => {},
    accessService: {} as any,
    emailService: {} as any,
    notificationService: { send: async () => {} } as any,
    cnameProxyService: {} as any,
    pluginConfigService: { getPluginConfig: async () => ({ sysSetting: {} }) } as any,
    urlService: { getPipelineDetailUrl: async () => "http://localhost/detail" } as any,
    user: { id: 1, role: "user" },
    serviceGetter: {} as any,
  });
  executor.runtime = new RunHistory(1, { type: "user" }, executor.pipeline);
  executor.currentStatusMap = new RunnableCollection(pipeline);
  executor.lastStatusMap = new RunnableCollection(undefined);
  return executor;
}

describe("Executor 后置任务", () => {
  beforeEach(() => {
    TestAfterTaskPlugin.calls = [];
  });

  it("成功条件下执行后置任务，并记录状态与日志", async () => {
    const pipeline = createPipeline([
      { id: "at1", title: "吊销旧证书", when: ["success"], type: "TestAfterTaskPlugin", input: { message: "hello" } },
    ]);
    const executor = createExecutor(pipeline);
    // 模拟 runWithHistory 已写入流水线最终状态
    executor.pipeline.status = { output: {}, status: ResultType.success, result: ResultType.success, startTime: Date.now() };

    await (executor as any).runAfterTasks({ result: ResultType.success });

    // 插件已执行，且能读取流水线运行结果
    assert.equal(TestAfterTaskPlugin.calls.length, 1);
    assert.equal(TestAfterTaskPlugin.calls[0].message, "hello");
    assert.equal(TestAfterTaskPlugin.calls[0].pipelineResult, ResultType.success);
    // 状态记录为成功
    const afterTask = executor.pipeline.afterTasks![0];
    assert.equal(afterTask.status?.result, ResultType.success);
    // 日志写入运行历史（key: afterTask.at1），可点击查看
    const logs = executor.runtime.logs["afterTask.at1"];
    assert.ok(logs && logs.length > 0);
    assert.ok(logs.some(line => line.includes("执行成功")));
  });

  it("条件不满足时（失败条件、实际成功）不执行后置任务，记录未触发日志与跳过状态", async () => {
    const pipeline = createPipeline([
      { id: "at2", title: "失败后清理", when: ["error"], type: "TestAfterTaskPlugin", input: {} },
    ]);
    const executor = createExecutor(pipeline);

    await (executor as any).runAfterTasks({ result: ResultType.success });

    assert.equal(TestAfterTaskPlugin.calls.length, 0);
    // 未触发：状态标记为 skip（与任务 skip 同语义），日志记录原因
    const afterTask = executor.pipeline.afterTasks![0];
    assert.equal(afterTask.status?.result, ResultType.skip);
    const logs = executor.runtime.logs["afterTask.at2"];
    assert.ok(logs && logs.length > 0);
    assert.ok(logs.some(line => line.includes("后置任务未触发")));
  });

  it("失败转成功条件：上次失败本次成功才触发", async () => {
    const pipeline = createPipeline([
      { id: "at3", title: "转成功通知", when: ["turnToSuccess"], type: "TestAfterTaskPlugin", input: {} },
    ]);
    const executor = createExecutor(pipeline);
    executor.lastRuntime = {
      pipeline: { status: { status: ResultType.error, result: ResultType.error } },
    } as any;

    await (executor as any).runAfterTasks({ result: ResultType.success });

    assert.equal(TestAfterTaskPlugin.calls.length, 1);
  });

  it("上次也成功时，失败转成功条件不触发", async () => {
    const pipeline = createPipeline([
      { id: "at4", title: "转成功通知", when: ["turnToSuccess"], type: "TestAfterTaskPlugin", input: {} },
    ]);
    const executor = createExecutor(pipeline);
    executor.lastRuntime = {
      pipeline: { status: { status: ResultType.success, result: ResultType.success } },
    } as any;

    await (executor as any).runAfterTasks({ result: ResultType.success });

    assert.equal(TestAfterTaskPlugin.calls.length, 0);
  });

  it("后置任务失败时返回错误（流水线整体视为失败），不再单独发送通知", async () => {
    const pipeline = createPipeline([
      { id: "at5", title: "可能失败的任务", when: ["success"], type: "TestAfterTaskFailPlugin", input: {} },
    ]);
    const executor = createExecutor(pipeline);
    let noticeSent = false;
    (executor as any).options.notificationService.send = async (req: any) => {
      noticeSent = true;
    };

    // runAfterTasks 抛出聚合错误（后置任务失败不再单独发送通知）
    await assert.rejects(
      async () => {
        await (executor as any).runAfterTasks({ result: ResultType.success });
      },
      (err: any) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes("后置任务[可能失败的任务]执行失败"));
        return true;
      }
    );

    const afterTask = executor.pipeline.afterTasks![0];
    assert.equal(afterTask.status?.result, ResultType.error);
    assert.equal(afterTask.status?.message, "模拟后置任务失败");
    assert.equal(noticeSent, false);
    // 失败日志已记录
    const logs = executor.runtime.logs["afterTask.at5"];
    assert.ok(logs.some(line => line.includes("执行失败")));
  });

  it("disabled 的后置任务不执行，记录禁用日志与状态", async () => {
    const pipeline = createPipeline([
      { id: "at6", title: "禁用任务", when: ["success"], type: "TestAfterTaskPlugin", input: {}, disabled: true },
    ]);
    const executor = createExecutor(pipeline);

    await (executor as any).runAfterTasks({ result: ResultType.success });

    assert.equal(TestAfterTaskPlugin.calls.length, 0);
    // 禁用：状态标记为 disabled（与任务 disabled 同语义），日志记录原因
    const afterTask = executor.pipeline.afterTasks![0];
    assert.equal(afterTask.status?.result, ResultType.disabled);
    const logs = executor.runtime.logs["afterTask.at6"];
    assert.ok(logs && logs.length > 0);
    assert.ok(logs.some(line => line.includes("已禁用")));
  });
});

describe("Executor 通知日志", () => {
  it("通知发送成功时记录日志并写入成功状态", async () => {
    const pipeline = createPipeline();
    pipeline.notifications = [
      { id: "n1", title: "成功通知", type: "other", when: ["success"], notificationId: 0 },
    ];
    const executor = createExecutor(pipeline);
    let sendCalled = false;
    (executor as any).options.notificationService.send = async () => {
      sendCalled = true;
    };

    await executor.notification("success");

    assert.equal(sendCalled, true);
    // 状态写在 executor.pipeline（cloneDeep 后的实例）上，随运行历史保存
    const notification = executor.pipeline.notifications![0];
    assert.equal(notification.status?.result, ResultType.success);
    const logs = executor.runtime.logs["notification.n1"];
    assert.ok(logs && logs.length > 0);
    assert.ok(logs.some(line => line.includes("通知发送成功")));
  });

  it("通知发送失败时记录日志与失败状态", async () => {
    const pipeline = createPipeline();
    pipeline.notifications = [
      { id: "n2", title: "失败通知", type: "other", when: ["success"], notificationId: 0 },
    ];
    const executor = createExecutor(pipeline);
    (executor as any).options.notificationService.send = async () => {
      throw new Error("通知渠道异常");
    };

    await executor.notification("success");

    const notification = executor.pipeline.notifications![0];
    assert.equal(notification.status?.result, ResultType.error);
    const logs = executor.runtime.logs["notification.n2"];
    assert.ok(logs.some(line => line.includes("发送失败")));
  });

  it("通知触发条件不满足时记录未触发日志，并标记跳过状态", async () => {
    const pipeline = createPipeline();
    pipeline.notifications = [
      { id: "n3", title: "失败才通知", type: "other", when: ["error"], notificationId: 0 },
    ];
    const executor = createExecutor(pipeline);
    let sendCalled = false;
    (executor as any).options.notificationService.send = async () => {
      sendCalled = true;
    };

    // 当前时机为 success，通知条件为 error：不发送
    await executor.notification("success");

    assert.equal(sendCalled, false);
    // 状态标记为 skip（与任务 skip 同语义，前端显示跳过图标）
    const notification = executor.pipeline.notifications![0];
    assert.equal(notification.status?.result, ResultType.skip);
    // 日志已记录未触发原因，点击通知可查看
    const logs = executor.runtime.logs["notification.n3"];
    assert.ok(logs && logs.length > 0);
    assert.ok(logs.some(line => line.includes("通知未触发")));
  });

  it("通知已发送后，其他时机条件不满足不覆盖已发送状态", async () => {
    const pipeline = createPipeline();
    pipeline.notifications = [
      { id: "n4", title: "开始时通知", type: "other", when: ["start", "error"], notificationId: 0 },
    ];
    const executor = createExecutor(pipeline);
    let sendCalled = false;
    (executor as any).options.notificationService.send = async () => {
      sendCalled = true;
    };

    // start 时机触发发送成功
    await executor.notification("start");
    assert.equal(sendCalled, true);
    assert.equal(executor.pipeline.notifications![0].status?.result, ResultType.success);
    // success 时机条件不满足：不应覆盖已发送的成功状态
    await executor.notification("success");
    assert.equal(executor.pipeline.notifications![0].status?.result, ResultType.success);
  });

  it("历史残留状态被运行时清空后，未触发能正确写入跳过状态", async () => {
    const pipeline = createPipeline();
    // 模拟历史残留：上一次运行发送成功的状态残留在通知上
    pipeline.notifications = [
      {
        id: "n5",
        title: "失败才通知",
        type: "other",
        when: ["error"],
        notificationId: 0,
        status: { output: {}, status: ResultType.success, result: ResultType.success, startTime: 1, endTime: 2 },
      },
    ];
    const executor = createExecutor(pipeline);
    // 运行时清空通知/后置任务的历史状态
    executor.runtime.clearNotificationStatus();

    // 当前时机为 success，通知条件为 error：未触发应写入 skip，而不是沿用残留的 success
    await executor.notification("success");

    const notification = executor.pipeline.notifications![0];
    assert.equal(notification.status?.result, ResultType.skip);
  });

  it("clearNotificationStatus 清空通知与后置任务的历史状态", () => {
    const pipeline = createPipeline([
      { id: "at9", title: "后置任务", when: ["success"], type: "TestAfterTaskPlugin", input: {} },
    ]);
    pipeline.notifications = [{ id: "n6", title: "通知", type: "other", when: ["error"], notificationId: 0 }];
    pipeline.notifications[0].status = { output: {}, status: ResultType.success, result: ResultType.success, startTime: 1, endTime: 2 };
    pipeline.afterTasks![0].status = { output: {}, status: ResultType.success, result: ResultType.success, startTime: 1, endTime: 2 };

    const runtime = new RunHistory(1, { type: "user" }, pipeline);
    runtime.clearNotificationStatus();

    assert.equal(pipeline.notifications![0].status, undefined);
    assert.equal(pipeline.afterTasks![0].status, undefined);
  });

  it("通知内容附加后置任务执行结果（成功/失败详情）", async () => {
    const pipeline = createPipeline([
      { id: "at10", title: "吊销旧证书", when: ["success"], type: "TestAfterTaskPlugin", input: {} },
      { id: "at11", title: "同步CDN", when: ["success"], type: "TestAfterTaskPlugin", input: {} },
    ]);
    pipeline.notifications = [
      { id: "n7", title: "结果通知", type: "other", when: ["success"], notificationId: 0 },
    ];
    const executor = createExecutor(pipeline);
    // 模拟后置任务执行结果：一个成功、一个失败
    executor.pipeline.afterTasks![0].status = {
      output: {},
      status: ResultType.success,
      result: ResultType.success,
      startTime: 1,
      endTime: 2,
    };
    executor.pipeline.afterTasks![1].status = {
      output: {},
      status: ResultType.error,
      result: ResultType.error,
      startTime: 1,
      endTime: 2,
      message: "模拟CDN同步失败",
    };
    let content = "";
    (executor as any).options.notificationService.send = async (req: any) => {
      content = req.body.content;
    };

    await executor.notification("success");

    assert.ok(content.includes("后置任务执行结果"));
    assert.ok(content.includes("吊销旧证书 执行成功"));
    assert.ok(content.includes("同步CDN 执行失败"));
    assert.ok(content.includes("模拟CDN同步失败"));
  });
});

describe("Executor 步骤执行", () => {
  it("插件主动返回 skip 时，输出仍写回历史（下次运行可读取上次输出）", async () => {
    const pipeline = createPipeline();
    pipeline.stages = [
      {
        id: "stage1",
        title: "阶段",
        tasks: [
          {
            id: "task1",
            title: "任务",
            steps: [{ id: "step1", title: "申请证书", type: "TestSkipOutputPlugin", input: {} }],
          },
        ],
      },
    ] as any;
    const executor = createExecutor(pipeline);
    const step: any = (pipeline.stages as any)[0].tasks[0].steps[0];

    const res = await (executor as any).runWithHistory(step, "step", async () => {
      return await (executor as any).runStep(step);
    });

    assert.equal(res, ResultType.skip);
    // 跳过时插件写入实例的输出属性应写回历史状态（否则下次运行读不到上次的证书）
    assert.ok(step.status.output.cert, "跳过时输出应写回历史");
    assert.equal(step.status.output.cert.crt, "mock-crt");
  });
});
