import assert from "assert";
import { CertApplyGetFormAliyunPlugin } from "./aliyun.js";

const logger = {
  info() {},
  warn() {},
  error() {},
};

function createPlugin() {
  const plugin = Object.create(CertApplyGetFormAliyunPlugin.prototype) as CertApplyGetFormAliyunPlugin;
  plugin.orderId = "cas_instance_123";
  plugin.logger = logger as any;
  plugin.sleep = async () => {};
  plugin.checkSignal = () => {};
  plugin.readLastCert = async () => ({ expires: 1000 }) as any;
  return plugin;
}

describe("CertApplyGetFormAliyunPlugin API 2.0", () => {
  it("实例已有不同到期时间的新证书时直接获取，不重复申请", async () => {
    const plugin = createPlugin();
    const actions: string[] = [];
    const sleepDurations: number[] = [];
    plugin.sleep = async (ms: number) => {
      sleepDurations.push(ms);
    };
    const certDetail = {
      getAllDomains() {
        return "example.com";
      },
      expires: Date.now(),
    } as any;
    plugin.getCertDetail = async (_client: any, certificateId: string) => {
      actions.push(`GetUserCertificateDetail:${certificateId}`);
      return certDetail;
    };
    const client = {
      async doRequest(req: any) {
        actions.push(req.action);
        if (req.action === "GetTaskAttribute") {
          assert.equal(req.data.query.TaskId, "cas_instance_123");
          if (actions.filter(action => action === "GetTaskAttribute").length === 1) {
            return { TaskStatus: "processing" };
          }
          return { TaskStatus: "success" };
        }
        if (req.action === "GetInstanceDetail") {
          return { CertificateId: "new-cert-id", CertificateNotAfter: 2 };
        }
        return {};
      },
    };

    const result = await plugin.doCertApplyV2(client);

    assert.equal(result, certDetail);
    assert.deepEqual(actions, ["GetInstanceDetail", "GetUserCertificateDetail:new-cert-id"]);
    assert.deepEqual(sleepDurations, []);
  });

  it("申请任务失败时报告阿里云错误且不读取证书详情", async () => {
    const plugin = createPlugin();
    const actions: string[] = [];
    const client = {
      async doRequest(req: any) {
        actions.push(req.action);
        if (req.action === "GetTaskAttribute") {
          return { TaskStatus: "failed", TaskMessage: "实例信息未填写完整" };
        }
        return {};
      },
    };

    await assert.rejects(() => plugin.doCertApplyV2(client), /阿里云证书申请提交失败：实例信息未填写完整/);
    assert.deepEqual(actions, ["GetInstanceDetail", "ApplyCertificate", "GetTaskAttribute"]);
  });

  it("十次实例详情检查仍是旧证书时超时失败", async () => {
    const plugin = createPlugin();
    let instanceDetailCount = 0;
    const sleepDurations: number[] = [];
    plugin.sleep = async (ms: number) => {
      sleepDurations.push(ms);
    };
    const client = {
      async doRequest(req: any) {
        if (req.action === "GetTaskAttribute") {
          return { TaskStatus: "success" };
        }
        if (req.action === "GetInstanceDetail") {
          instanceDetailCount++;
          return { CertificateId: "old-cert-id" };
        }
        return {};
      },
    };

    await assert.rejects(() => plugin.doCertApplyV2(client), /等待阿里云新证书生成超时/);
    assert.equal(instanceDetailCount, 11);
    assert.deepEqual(sleepDurations, Array(9).fill(60 * 1000));
  });
});
