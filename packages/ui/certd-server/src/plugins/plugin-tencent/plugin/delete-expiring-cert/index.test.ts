import "reflect-metadata";
import assert from "node:assert/strict";
import esmock from "esmock";
import { AbstractTaskPlugin, ConcurrencyStrategy, Executor, pluginRegistry, ResultType, RunStrategy } from "@certd/pipeline";
import { utils } from "@certd/basic";
import { tmpdir } from "node:os";

const pluginName = "TencentDeleteExpiringCert";
const originalNow = Date.now;
const originalSleep = utils.sleep;
let originalRegistration: any;

async function createFixture(statuses: Array<number | string | undefined> = [1]) {
  const certificates = statuses.map((status, index) => ({
    CertificateId: `cert-${index}`,
    CertEndTime: "2000-01-01 00:00:00",
    Alias: "测试证书",
    Domain: "example.invalid",
  }));
  const taskIds = certificates.map((cert, index) => ({ TaskId: `task-${index}` }));
  const results = statuses.map((status, index) => ({ TaskId: `task-${index}`, CertId: `cert-${index}`, Status: status }));
  const state: any = {
    now: originalNow(),
    certificates,
    deleteResponse: { CertTaskIds: taskIds },
    responses: [{ DeleteTaskResult: results }],
    pollCount: 0,
    failAction: "",
    requestError: new Error("模拟接口异常"),
  };
  const logs: string[] = [];
  const calls: Array<{ action: string; params: any }> = [];
  const sleeps: number[] = [];
  const controller = new AbortController();
  const recordLog = (...args: any[]) => {
    const parts = args.map(String);
    const line = parts.join(" ");
    logs.push(line);
  };
  const logger = { info: recordLog, error: recordLog, warn: recordLog, debug() {} };
  const sleep = async (ms: number) => {
    sleeps.push(ms);
    state.now += ms;
  };

  class MockSslClient {
    async DescribeCertificates(params: any) {
      const copiedParams = structuredClone(params);
      calls.push({ action: "DescribeCertificates", params: copiedParams });
      if (state.failAction === "DescribeCertificates") {
        throw state.requestError;
      }
      return { Certificates: state.certificates };
    }
    async doRequest(action: string, params: any) {
      const copiedParams = structuredClone(params);
      calls.push({ action, params: copiedParams });
      if (state.failAction === action) {
        throw state.requestError;
      }
      if (action === "DeleteCertificates") {
        return state.deleteResponse;
      }
      assert.equal(action, "DescribeDeleteCertificatesTaskResult");
      state.now += 1000;
      const index = Math.min(state.pollCount, state.responses.length - 1);
      state.pollCount++;
      assert.ok(state.pollCount <= 100, "轮询必须有界");
      return structuredClone(state.responses[index]);
    }
  }

  const loaded = await esmock("./index.js", {
    "@certd/plugin-plus": { AbstractPlusTaskPlugin: AbstractTaskPlugin },
    "../../../plugin-lib/tencent/index.js": { TencentSslClient: MockSslClient },
  });
  const Plugin = loaded.TencentDeleteExpiringCert;
  Plugin.prototype.getAccess = async () => ({});
  Date.now = () => state.now;
  utils.sleep = sleep;
  const plugin = new Plugin();
  Object.assign(plugin, { accessId: "mock-access", maxCount: 100, expiringDays: 18, checkTimeout: 1, logger });
  plugin.ctx = { logger, utils: { sleep }, signal: controller.signal };
  return { plugin, Plugin, state, logs, calls, sleeps, signal: controller, sleep };
}

async function runPipelineFixture() {
  const sent: any[] = [];
  const finished: any[] = [];
  const writes: Array<{ key: string; value: string }> = [];
  const pipeline: any = {
    id: 1,
    title: "腾讯云清理回归",
    userId: 1,
    stages: [
      {
        id: "stage-1",
        title: "部署",
        concurrency: ConcurrencyStrategy.Serial,
        tasks: [
          {
            id: "task-1",
            title: "清理",
            steps: [
              {
                id: "step-1",
                title: "删除旧证书",
                type: pluginName,
                strategy: { runStrategy: RunStrategy.AlwaysRun },
                input: { accessId: "mock-access", maxCount: 100, expiringDays: 18, checkTimeout: 1 },
              },
            ],
          },
        ],
      },
    ],
    notifications: [
      { id: "error-notice", title: "失败通知", type: "other", when: ["error"], notificationId: 1 },
      { id: "success-notice", title: "成功通知", type: "other", when: ["success"], notificationId: 2 },
    ],
  };
  const executor = new Executor({
    pipeline,
    storage: {
      get: async () => null,
      set: async (_scope, _namespace, _version, key, value) => {
        writes.push({ key, value });
      },
      remove: async () => {},
    },
    onChanged: async () => {},
    onFinished: async history => {
      const snapshot = structuredClone(history.pipeline);
      finished.push(snapshot);
    },
    accessService: {} as any,
    emailService: {} as any,
    notificationService: {
      send: async request => {
        sent.push(request);
      },
    } as any,
    cnameProxyService: {} as any,
    pluginConfigService: { getPluginConfig: async () => ({ sysSetting: { input: {} } }) } as any,
    urlService: { getPipelineDetailUrl: async () => "https://example.invalid/pipeline/1" } as any,
    user: { id: 1, role: "user" },
    serviceGetter: {} as any,
    fileRootDir: tmpdir(),
  });
  const result = await executor.run(1, "manual");
  return { executor, result, sent, finished, writes };
}

describe("TencentDeleteExpiringCert", () => {
  beforeEach(() => {
    const storage = pluginRegistry.getStorage();
    originalRegistration = storage[pluginName];
  });

  afterEach(() => {
    Date.now = originalNow;
    utils.sleep = originalSleep;
    if (originalRegistration) {
      pluginRegistry.register(pluginName, originalRegistration);
    } else {
      pluginRegistry.unRegister(pluginName);
    }
  });

  for (const [status, reason] of [
    [2, /失败/],
    [3, /SSL_QCSLinkedRoleInReplaceLoadCertificate/],
    [4, /未解绑/],
    [5, /查询关联.*超时/],
    [99, /未知状态.*99/],
    [undefined, /未知状态.*undefined/],
    ["1", /未知状态.*1/],
  ] as Array<[number | string | undefined, RegExp]>) {
    it(`状态 ${String(status)} 必须传播失败`, async () => {
      const fixture = await createFixture([status]);
      await assert.rejects(
        () => fixture.plugin.execute(),
        (error: Error) => {
          assert.match(error.message, reason);
          assert.match(error.message, /task-0/);
          assert.match(error.message, /cert-0/);
          return true;
        }
      );
    });
  }

  it("全部成功保持成功且删除参数不变", async () => {
    const fixture = await createFixture([1, 1]);
    await fixture.plugin.execute();
    const request = fixture.calls.find(call => call.action === "DeleteCertificates");
    assert.deepEqual(request?.params, { CertificateIds: ["cert-0", "cert-1"], IsSync: true });
  });

  it("跨轮询保留失败而不是被后续成功覆盖", async () => {
    const fixture = await createFixture([4, 1]);
    fixture.state.responses = [
      {
        DeleteTaskResult: [
          { TaskId: "task-0", CertId: "cert-0", Status: 4 },
          { TaskId: "task-1", CertId: "cert-1", Status: 0 },
        ],
      },
      { DeleteTaskResult: [{ TaskId: "task-1", CertId: "cert-1", Status: 1 }] },
    ];
    await assert.rejects(
      () => fixture.plugin.execute(),
      (error: Error) => {
        assert.match(error.message, /成功[:：]\s*1/);
        assert.match(error.message, /失败[:：]\s*1/);
        assert.match(error.message, /task-0/);
        assert.match(error.message, /未解绑/);
        return true;
      }
    );
    assert.equal(fixture.state.pollCount, 2);
  });

  for (const response of [{ DeleteTaskResult: [{ TaskId: "task-0", CertId: "cert-0", Status: 0 }] }, { DeleteTaskResult: [] }, {}]) {
    it("未完成或无有效查询结果必须超时失败", async () => {
      const fixture = await createFixture([0]);
      fixture.state.responses = [response];
      await assert.rejects(
        () => fixture.plugin.execute(),
        (error: Error) => {
          assert.match(error.message, /超时/);
          assert.match(error.message, /task-0/);
          assert.match(error.message, /未完成[:：]\s*1/);
          return true;
        }
      );
    });
  }

  it("混合成功、失败和进行中时超时摘要保留全部结果", async () => {
    const fixture = await createFixture([1, 4, 0]);
    fixture.state.responses.push({ DeleteTaskResult: [{ TaskId: "task-2", CertId: "cert-2", Status: 0 }] });
    await assert.rejects(
      () => fixture.plugin.execute(),
      (error: Error) => {
        for (const pattern of [/超时/, /成功[:：]\s*1/, /失败[:：]\s*1/, /未完成[:：]\s*1/, /task-1/, /未解绑/, /task-2/]) {
          assert.match(error.message, pattern);
        }
        return true;
      }
    );
  });

  it("同批次部分成功不能掩盖失败", async () => {
    const fixture = await createFixture([1, 4]);
    await assert.rejects(
      () => fixture.plugin.execute(),
      (error: Error) => {
        assert.match(error.message, /成功[:：]\s*1/);
        assert.match(error.message, /失败[:：]\s*1/);
        assert.match(error.message, /task-1/);
        assert.match(error.message, /未解绑/);
        return true;
      }
    );
    assert.equal(fixture.state.pollCount, 1);
  });

  for (const status of [2, 3, 4, 5, 99]) {
    it(`状态 ${status} 通过真实执行链产生失败历史及失败通知`, async () => {
      await createFixture([status]);
      const run = await runPipelineFixture();
      assert.equal(run.result, ResultType.error);
      const pipeline = run.executor.pipeline;
      const stage = pipeline.stages[0];
      const task = stage.tasks[0];
      const step = task.steps[0];
      for (const runnable of [step, task, stage, pipeline]) {
        assert.equal(runnable.status?.status, ResultType.error);
        assert.equal(runnable.status?.result, ResultType.error);
      }
      assert.equal(run.finished.length, 1);
      assert.equal(run.finished[0].status.status, ResultType.error);
      const saved = run.writes.find(write => write.key === "lastRuntime");
      assert.ok(saved);
      const storedValue = JSON.parse(saved.value);
      const history = storedValue.value;
      assert.equal(history.pipeline.status.status, ResultType.error);
      const sentIds = run.sent.map(request => request.id);
      assert.deepEqual(sentIds, [1]);
      assert.match(run.sent[0].body.content, /task-0/);
    });
  }

  it("成功对照通过真实执行链只发送成功通知", async () => {
    await createFixture([1]);
    const run = await runPipelineFixture();
    assert.equal(run.result, ResultType.success);
    const pipeline = run.executor.pipeline;
    const stage = pipeline.stages[0];
    const task = stage.tasks[0];
    for (const runnable of [task.steps[0], task, stage, pipeline]) {
      assert.equal(runnable.status?.status, ResultType.success);
    }
    const sentIds = run.sent.map(request => request.id);
    assert.deepEqual(sentIds, [2]);
  });

  for (const response of [undefined, null, {}, { CertTaskIds: [] }, { CertTaskIds: {} }, { CertTaskIds: [{}] }, { CertTaskIds: [{ TaskId: " " }] }, { CertTaskIds: [{ TaskId: "task-0" }, {}] }]) {
    it("提交结果不完整时不允许误判成功或依赖偶然TypeError", async () => {
      const fixture = await createFixture([1]);
      fixture.state.deleteResponse = response;
      await assert.rejects(
        () => fixture.plugin.execute(),
        (error: Error) => {
          assert.notEqual(error.name, "TypeError");
          assert.match(error.message, /删除任务提交结果异常/);
          return true;
        }
      );
      const queries = fixture.calls.filter(call => call.action === "DescribeDeleteCertificatesTaskResult");
      assert.equal(queries.length, 0);
    });
  }

  it("重复、无关和缺少TaskId的结果不污染计数", async () => {
    const fixture = await createFixture([1, 4]);
    fixture.state.responses = [
      {
        DeleteTaskResult: [
          { TaskId: "task-0", CertId: "cert-0", Status: 1 },
          { TaskId: "task-0", CertId: "cert-0", Status: 1 },
          { TaskId: "other-task", CertId: "other-cert", Status: 4 },
          { Status: 4 },
          { TaskId: "task-1", CertId: "cert-1", Status: 0 },
        ],
      },
      {
        DeleteTaskResult: [
          { TaskId: "task-0", CertId: "cert-0", Status: 1 },
          { TaskId: "task-1", CertId: "cert-1", Status: 4 },
        ],
      },
    ];
    await assert.rejects(
      () => fixture.plugin.execute(),
      (error: Error) => {
        assert.match(error.message, /成功[:：]\s*1/);
        assert.match(error.message, /失败[:：]\s*1/);
        assert.doesNotMatch(error.message, /other-task/);
        return true;
      }
    );
    assert.equal(fixture.state.pollCount, 2);
    const queries = fixture.calls.filter(call => call.action === "DescribeDeleteCertificatesTaskResult");
    assert.deepEqual(queries[1].params.TaskIds, ["task-1"]);
  });

  it("重复的已提交任务ID仅处理一次", async () => {
    const fixture = await createFixture([1]);
    fixture.state.deleteResponse = { CertTaskIds: [{ TaskId: "task-0" }, { TaskId: "task-0" }] };
    await fixture.plugin.execute();
    const query = fixture.calls.find(call => call.action === "DescribeDeleteCertificatesTaskResult");
    assert.deepEqual(query?.params.TaskIds, ["task-0"]);
  });

  for (const response of [{ DeleteTaskResult: [] }, {}]) {
    it("无有效查询结果时等待而不是忙等", async () => {
      const fixture = await createFixture([0]);
      fixture.state.responses = [response];
      await assert.rejects(() => fixture.plugin.execute(), /超时/);
      assert.ok(fixture.sleeps.length > 0);
      const allWaitsUseExistingInterval = fixture.sleeps.every(ms => ms === 10000);
      assert.ok(allWaitsUseExistingInterval);
      assert.ok(fixture.state.pollCount < 20);
    });
  }

  for (const noCandidates of ["empty", "not-expiring"]) {
    it(`没有符合条件的证书时正常结束：${noCandidates}`, async () => {
      const fixture = await createFixture([1]);
      if (noCandidates === "empty") {
        fixture.state.certificates = [];
      } else {
        fixture.state.certificates[0].CertEndTime = "2999-01-01 00:00:00";
      }
      await fixture.plugin.execute();
      const deleteWasRequested = fixture.calls.some(call => call.action === "DeleteCertificates");
      assert.equal(deleteWasRequested, false);
    });
  }

  for (const action of ["DescribeCertificates", "DeleteCertificates", "DescribeDeleteCertificatesTaskResult"]) {
    it(`接口异常原样传播：${action}`, async () => {
      const fixture = await createFixture([1]);
      fixture.state.failAction = action;
      await assert.rejects(
        () => fixture.plugin.execute(),
        error => error === fixture.state.requestError
      );
    });
  }

  it("取消信号不被转换为成功或普通超时", async () => {
    const fixture = await createFixture([0]);
    fixture.signal.abort();
    await assert.rejects(
      () => fixture.plugin.execute(),
      (error: Error) => {
        // CancelError 未设置 this.name，依赖侧 .name 仍为 Error；用构造名确认取消语义
        assert.equal(error.constructor.name, "CancelError");
        assert.match(error.message, /取消/);
        assert.doesNotMatch(error.message, /超时/);
        return true;
      }
    );
  });

  it("超时通过真实执行链产生失败历史及失败通知", async () => {
    const fixture = await createFixture([0]);
    const run = await runPipelineFixture();
    assert.equal(run.result, ResultType.error);
    const pipeline = run.executor.pipeline;
    const stage = pipeline.stages[0];
    const task = stage.tasks[0];
    for (const runnable of [task.steps[0], task, stage, pipeline]) {
      assert.equal(runnable.status?.status, ResultType.error);
    }
    assert.equal(run.finished[0].status.status, ResultType.error);
    const sentIds = run.sent.map(request => request.id);
    assert.deepEqual(sentIds, [1]);
    assert.match(run.sent[0].body.content, /超时/);
    assert.ok(fixture.sleeps.length > 0);
  });

  it("提交响应Fail与任务成功并存时整批失败并保留失败证书明细", async () => {
    const fixture = await createFixture([1, 1]);
    fixture.state.deleteResponse = {
      Fail: [{ CertId: "cert-0", Msg: "证书仍被资源绑定" }],
      CertTaskIds: [{ CertId: "cert-1", TaskId: "task-1" }],
    };
    fixture.state.responses = [{ DeleteTaskResult: [{ TaskId: "task-1", CertId: "cert-1", Status: 1 }] }];
    await assert.rejects(
      () => fixture.plugin.execute(),
      (error: Error) => {
        assert.match(error.message, /删除证书任务失败/);
        assert.match(error.message, /成功[:：]\s*1/);
        assert.match(error.message, /失败[:：]\s*1/);
        assert.match(error.message, /cert-0/);
        assert.match(error.message, /证书仍被资源绑定/);
        return true;
      }
    );
  });

  it("CertTaskIds为空且Fail非空时抛删除证书任务失败并含Fail明细", async () => {
    const fixture = await createFixture([1]);
    fixture.state.deleteResponse = {
      Fail: [{ CertId: "cert-0", Msg: "证书不存在或已删除" }],
      CertTaskIds: [],
    };
    await assert.rejects(
      () => fixture.plugin.execute(),
      (error: Error) => {
        assert.match(error.message, /删除证书任务失败/);
        assert.doesNotMatch(error.message, /删除任务提交结果异常/);
        assert.match(error.message, /cert-0/);
        assert.match(error.message, /证书不存在或已删除/);
        return true;
      }
    );
    const queries = fixture.calls.filter(call => call.action === "DescribeDeleteCertificatesTaskResult");
    assert.equal(queries.length, 0);
  });

  it("提交响应Fail通过真实执行链产生失败历史及失败通知", async () => {
    const fixture = await createFixture([1, 1]);
    fixture.state.deleteResponse = {
      Fail: [{ CertId: "cert-0", Msg: "证书仍被资源绑定" }],
      CertTaskIds: [{ CertId: "cert-1", TaskId: "task-1" }],
    };
    fixture.state.responses = [{ DeleteTaskResult: [{ TaskId: "task-1", CertId: "cert-1", Status: 1 }] }];
    const run = await runPipelineFixture();
    assert.equal(run.result, ResultType.error);
    const pipeline = run.executor.pipeline;
    const stage = pipeline.stages[0];
    const task = stage.tasks[0];
    for (const runnable of [task.steps[0], task, stage, pipeline]) {
      assert.equal(runnable.status?.status, ResultType.error);
    }
    const sentIds = run.sent.map(request => request.id);
    assert.deepEqual(sentIds, [1]);
    assert.match(run.sent[0].body.content, /cert-0/);
    assert.match(run.sent[0].body.content, /证书仍被资源绑定/);
  });

  it("提交含CertId映射且查询持续为空时超时摘要保留CertId", async () => {
    const fixture = await createFixture([0]);
    fixture.state.deleteResponse = { CertTaskIds: [{ CertId: "cert-0", TaskId: "task-0" }] };
    fixture.state.responses = [{ DeleteTaskResult: [] }];
    await assert.rejects(
      () => fixture.plugin.execute(),
      (error: Error) => {
        assert.match(error.message, /超时/);
        assert.match(error.message, /task-0/);
        assert.match(error.message, /cert-0/);
        assert.match(error.message, /未完成[:：]\s*1/);
        return true;
      }
    );
  });

  it("轮询结果丢失CertId时失败摘要保留此前已知CertId", async () => {
    const fixture = await createFixture([0]);
    fixture.state.deleteResponse = { CertTaskIds: [{ TaskId: "task-0" }] };
    fixture.state.responses = [{ DeleteTaskResult: [{ TaskId: "task-0", CertId: "cert-0", Status: 0 }] }, { DeleteTaskResult: [{ TaskId: "task-0", Status: 4 }] }];
    await assert.rejects(
      () => fixture.plugin.execute(),
      (error: Error) => {
        assert.match(error.message, /删除证书任务失败/);
        assert.match(error.message, /task-0/);
        assert.match(error.message, /cert-0/);
        assert.match(error.message, /未解绑/);
        return true;
      }
    );
  });

  it("提交映射有CertId且轮询全程不带CertId时摘要仍含CertId", async () => {
    const fixture = await createFixture([0]);
    fixture.state.deleteResponse = { CertTaskIds: [{ CertId: "cert-0", TaskId: "task-0" }] };
    fixture.state.responses = [{ DeleteTaskResult: [{ TaskId: "task-0", Status: 4 }] }];
    await assert.rejects(
      () => fixture.plugin.execute(),
      (error: Error) => {
        assert.match(error.message, /删除证书任务失败/);
        assert.match(error.message, /task-0/);
        assert.match(error.message, /cert-0/);
        assert.match(error.message, /未解绑/);
        return true;
      }
    );
  });
});
