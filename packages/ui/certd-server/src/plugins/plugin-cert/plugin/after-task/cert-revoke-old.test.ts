import assert from "assert";
import { CertRevokeOldPlugin } from "./cert-revoke-old.js";

/**
 * 构造含证书申请步骤（CertApply）的流水线
 */
function createApplyPipeline(taskId = "apply-step-1") {
  return {
    id: 5,
    stages: [
      {
        id: "stage1",
        tasks: [
          {
            id: "task1",
            steps: [{ id: taskId, type: "CertApply" }],
          },
        ],
      },
    ],
  };
}

function createPlugin(opts: { revokeOld?: boolean; list?: any[]; pipeline?: any; filterByTaskId?: boolean } = {}) {
  const { revokeOld = true, list = [], pipeline = createApplyPipeline(), filterByTaskId = true } = opts;
  const plugin = new CertRevokeOldPlugin();
  plugin.revokeOld = revokeOld;
  plugin.logger = { info: () => {}, warn: () => {}, error: () => {} } as any;
  plugin.ctx = {
    pipeline,
    user: { id: 1 },
    projectId: 2,
    serviceGetter: {
      get: async () => ({
        find: async (args: any) => {
          if (!filterByTaskId) {
            return list;
          }
          // 模拟数据库按 taskId IN (...) 条件过滤
          const taskIds = args.where?.taskId?._value as string[] | undefined;
          if (!taskIds || taskIds.length === 0) {
            return [];
          }
          return list.filter(item => taskIds.includes(item.taskId));
        },
        revoke: async () => {},
      }),
    },
  } as any;
  return plugin;
}

describe("CertRevokeOldPlugin 后置任务", () => {
  it("关闭吊销开关时跳过，不查询证书仓库", async () => {
    const plugin = new CertRevokeOldPlugin();
    plugin.revokeOld = false;
    plugin.logger = { info: () => {} } as any;
    let getCalled = false;
    plugin.ctx = {
      pipeline: { id: 5 },
      serviceGetter: {
        get: async () => {
          getCalled = true;
          throw new Error("不应调用证书仓库服务");
        },
      },
    } as any;

    await plugin.execute();
    assert.equal(getCalled, false);
  });

  it("没有未激活旧证书时跳过", async () => {
    const plugin = createPlugin({ list: [] });
    await plugin.execute();
  });

  it("吊销该流水线同一申请任务产出的旧证书，并传入用户与项目", async () => {
    const revoked: any[] = [];
    const plugin = createPlugin({
      list: [
        { id: 10, domains: "a.com", taskId: "apply-step-1" },
        { id: 11, domains: "b.com", taskId: "apply-step-1" },
      ],
    });
    plugin.ctx.serviceGetter.get = async () =>
      ({
        find: async (args: any) => {
          // 校验按申请任务 id 精确过滤
          assert.deepEqual(args.where.taskId._value, ["apply-step-1"]);
          return [
            { id: 10, domains: "a.com", taskId: "apply-step-1" },
            { id: 11, domains: "b.com", taskId: "apply-step-1" },
          ];
        },
        revoke: async (id: number, userId: number, projectId?: number) => {
          revoked.push({ id, userId, projectId });
        },
      } as any);

    await plugin.execute();

    assert.deepEqual(revoked, [
      { id: 10, userId: 1, projectId: 2 },
      { id: 11, userId: 1, projectId: 2 },
    ]);
  });

  it("其他任务产出的旧证书不被吊销（仅吊销同任务id的证书）", async () => {
    const revoked: any[] = [];
    const plugin = createPlugin({
      // 同任务与不同任务的证书混杂
      list: [
        { id: 10, domains: "a.com", taskId: "apply-step-1" },
        { id: 20, domains: "other.com", taskId: "other-step-9" },
      ],
    });
    plugin.ctx.serviceGetter.get = async () =>
      ({
        find: async (args: any) => {
          const taskIds = args.where.taskId._value as string[];
          return [
            { id: 10, domains: "a.com", taskId: "apply-step-1" },
            { id: 20, domains: "other.com", taskId: "other-step-9" },
          ].filter(item => taskIds.includes(item.taskId));
        },
        revoke: async (id: number, userId: number, projectId?: number) => {
          revoked.push({ id, userId, projectId });
        },
      } as any);

    await plugin.execute();

    // 只吊销了同任务（apply-step-1）产出的旧证书
    assert.deepEqual(
      revoked.map(item => item.id),
      [10]
    );
  });

  it("流水线中没有证书申请任务时跳过，不吊销任何证书", async () => {
    const plugin = createPlugin({
      pipeline: { id: 5, stages: [] },
      list: [{ id: 10, domains: "a.com", taskId: "apply-step-1" }],
    });
    plugin.ctx.serviceGetter.get = async () =>
      ({
        find: async () => {
          throw new Error("不应查询证书仓库");
        },
        revoke: async () => {},
      } as any);

    await plugin.execute();
  });

  it("配置等待时长时，先等待再吊销", async () => {
    let sleptMs = 0;
    const plugin = createPlugin({
      list: [{ id: 10, domains: "a.com", taskId: "apply-step-1" }],
    });
    plugin.delay = 2;
    (plugin.ctx as any).utils = {
      sleep: async (ms: number) => {
        sleptMs = ms;
      },
    };

    await plugin.execute();

    assert.equal(sleptMs, 2000);
  });
});
