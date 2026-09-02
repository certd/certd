import assert from "assert";
import { CertInfoService } from "./cert-info-service.js";
import { CertStatus } from "../entity/cert-info.js";
import { AcmeService } from "../../../plugins/plugin-cert/plugin/cert-plugin/acme.js";
// @ts-ignore
import forge from "node-forge";

function createSelfSignedCert(domain = "example.com") {
  const keypair = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keypair.publicKey;
  cert.serialNumber = "01";
  cert.validFrom = new Date(Date.now() - 86400000).toISOString();
  cert.validTo = new Date(Date.now() + 90 * 86400000).toISOString();
  const attrs = [{ name: "commonName", value: domain }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.setExtensions([{ name: "subjectAltName", altNames: [{ type: 2, value: domain }] }]);
  cert.sign(keypair.privateKey, forge.md.sha256.create());
  return {
    crt: forge.pki.certificateToPem(cert),
    key: forge.pki.privateKeyToPem(keypair.privateKey),
  };
}

function createCertInfoService() {
  const service = new CertInfoService();
  service.userSettingsService = {
    async incrementStatistic() {},
  } as any;
  return service;
}

describe("CertInfoService", () => {
  it("counts wildcard domains by normalized prefix", () => {
    const service = new CertInfoService();

    assert.equal(service.countWildcardDomains(["*.a.com", "a.com", " *.B.com "]), 2);
  });

  describe("updateCertByPipelineId 多条模式", () => {
    it("新建激活证书并绑定流水线id、继承已有记录来源", async () => {
      const service = createCertInfoService();
      // 该流水线已有旧证书记录（upload 来源），但没有空证书记录
      const existing = { id: 10, userId: 2, projectId: 3, pipelineId: 1, fromType: "upload", status: CertStatus.inactive };
      service.repository = {
        async findOne(args: any) {
          const where = args?.where ?? args;
          if (where.certInfo !== undefined) {
            // 空证书记录（占位）查询：该流水线没有占位记录
            return null;
          }
          return existing;
        },
        async delete() {},
        async update() {},
      } as any;
      service.pipelineRepository = {
        async findOne() {
          return { id: 1, userId: 2, projectId: 3, type: "cert_upload" };
        },
      } as any;
      let newBean: any = null;
      service.addOrUpdate = async (bean: any) => {
        bean.id = 100;
        newBean = bean;
        return bean;
      };

      const cert = createSelfSignedCert();
      const bean = await service.updateCertByPipelineId(1, cert, "pipeline");

      assert.equal(bean.id, 100);
      assert.equal(newBean.pipelineId, 1);
      // 来源保持与该流水线原有记录一致
      assert.equal(bean.fromType, "upload");
      assert.equal(bean.userId, 2);
      assert.equal(bean.projectId, 3);
      assert.equal(bean.status, CertStatus.active);
      assert.ok(bean.certInfo.includes("BEGIN CERTIFICATE"));
      assert.equal(bean.domain, "example.com");
    });

    it("无已有记录时按流水线类型推导来源，并把同流水线旧激活证书标记为未激活", async () => {
      const service = createCertInfoService();
      service.repository = {
        async find() {
          return [];
        },
        async findOne() {
          return null;
        },
        async delete() {},
      } as any;
      service.pipelineRepository = {
        async findOne() {
          return { id: 1, userId: 2, projectId: 3, type: "cert_upload" };
        },
      } as any;
      let newId = 0;
      service.addOrUpdate = async (bean: any) => {
        newId = 100;
        bean.id = 100;
        return bean;
      };
      let updateWhere: any = null;
      let updateSet: any = null;
      service.repository.update = async (where: any, set: any) => {
        updateWhere = where;
        updateSet = set;
        return {} as any;
      };

      const cert = createSelfSignedCert();
      const bean = await service.updateCertByPipelineId(1, cert, "pipeline");

      assert.equal(newId, 100);
      assert.equal(bean.pipelineId, 1);
      // 无已有记录时按流水线类型推导来源（cert_upload -> upload）
      assert.equal(bean.fromType, "upload");
      assert.equal(bean.userId, 2);
      assert.equal(bean.projectId, 3);
      assert.equal(bean.status, CertStatus.active);
      assert.equal(updateWhere.pipelineId, 1);
      assert.equal(updateWhere.status, CertStatus.active);
      assert.equal(updateWhere.id._value, 100);
      assert.equal(updateSet.status, CertStatus.inactive);
    });

    it("无已有记录且流水线类型无对应来源时，使用传入来源", async () => {
      const service = createCertInfoService();
      service.repository = {
        async find() {
          return [];
        },
        async findOne() {
          return null;
        },
        async delete() {},
        async update() {},
      } as any;
      service.pipelineRepository = {
        async findOne() {
          return { id: 1, userId: 2, projectId: 3, type: "custom" };
        },
      } as any;
      service.addOrUpdate = async (bean: any) => {
        bean.id = 100;
        return bean;
      };

      const cert = createSelfSignedCert();
      const bean = await service.updateCertByPipelineId(1, cert, "pipeline");

      assert.equal(bean.fromType, "pipeline");
      assert.equal(bean.pipelineId, 1);
    });

    it("传申请任务id时，新证书记录任务id，且只把同任务旧证书标记为未激活", async () => {
      const service = createCertInfoService();
      service.repository = {
        async find() {
          return [];
        },
        async findOne() {
          return null;
        },
        async delete() {},
      } as any;
      service.pipelineRepository = {
        async findOne() {
          return { id: 1, userId: 2, projectId: 3, type: "cert_auto" };
        },
      } as any;
      let newBean: any = null;
      service.addOrUpdate = async (bean: any) => {
        bean.id = 100;
        newBean = bean;
        return bean;
      };
      let updateWhere: any = null;
      let updateSet: any = null;
      service.repository.update = async (where: any, set: any) => {
        updateWhere = where;
        updateSet = set;
        return {} as any;
      };

      const cert = createSelfSignedCert();
      await service.updateCertByPipelineId(1, cert, "pipeline", "apply-step-1");

      // 新证书记录了申请任务 id
      assert.equal(newBean.taskId, "apply-step-1");
      // 旧证书标记未激活的条件限定为同任务 id（不误伤其他任务的证书）
      assert.equal(updateWhere.pipelineId, 1);
      assert.equal(updateWhere.status, CertStatus.active);
      assert.equal(updateWhere.taskId, "apply-step-1");
      assert.equal(updateSet.status, CertStatus.inactive);
    });

    it("存在空证书记录时，申请成功后直接更新占位记录，不新建记录", async () => {
      const service = createCertInfoService();
      // 保存流水线时创建的空证书记录（占位，certInfo 为空，已记录申请任务id）
      const emptyRecord = { id: 184, userId: 2, projectId: 1, pipelineId: 209, fromType: "pipeline", status: CertStatus.active, taskId: "PgaUhdeO1DWB_BLbIlzqV", certInfo: null };
      service.repository = {
        async find() {
          return [];
        },
        async findOne() {
          // 既有记录查询与空证书记录查询都命中同一条占位记录
          return emptyRecord;
        },
      } as any;
      service.pipelineRepository = {
        async findOne() {
          return { id: 209, userId: 2, projectId: 1, type: "cert_auto" };
        },
      } as any;
      let newBean: any = null;
      service.addOrUpdate = async (bean: any) => {
        // 更新占位记录：保留原 id，不分配新 id
        newBean = bean;
        return bean;
      };
      let updateWhere: any = null;
      let updateSet: any = null;
      service.repository.update = async (where: any, set: any) => {
        updateWhere = where;
        updateSet = set;
        return {} as any;
      };

      const cert = createSelfSignedCert();
      const bean = await service.updateCertByPipelineId(209, cert, "pipeline", "PgaUhdeO1DWB_BLbIlzqV");

      // 直接更新占位记录（id 不变），写入证书内容并保持激活，不再新建一条
      assert.equal(newBean.id, 184);
      assert.equal(newBean.taskId, "PgaUhdeO1DWB_BLbIlzqV");
      assert.equal(newBean.status, CertStatus.active);
      assert.ok(newBean.certInfo.includes("BEGIN CERTIFICATE"));
      assert.equal(bean.id, 184);
      // 标记未激活时排除占位记录自己（id: Not(184)），其他同任务 active 记录被标记
      assert.equal(updateWhere.pipelineId, 209);
      assert.equal(updateWhere.status, CertStatus.active);
      assert.equal(updateWhere.id._value, 184);
      assert.equal(updateWhere.taskId, "PgaUhdeO1DWB_BLbIlzqV");
      assert.equal(updateSet.status, CertStatus.inactive);
    });

    it("updateCertByPipelineId 从流水线配置解析并记录 ACME账号授权id（供吊销读表，不再查流水线）", async () => {
      const service = createCertInfoService();
      service.repository = {
        async findOne(args: any) {
          const where = args?.where ?? args;
          if (where.certInfo !== undefined) {
            // 占位记录查询：没有占位记录
            return null;
          }
          // 已有记录查询：没有历史记录
          return null;
        },
        async delete() {},
        async update() {},
      } as any;
      service.pipelineRepository = {
        async findOne(args: any) {
          if (args?.select) {
            return { type: "cert_auto" };
          }
          return {
            id: 1,
            userId: 2,
            projectId: 3,
            type: "cert_auto",
            content: JSON.stringify({
              stages: [
                {
                  tasks: [
                    {
                      steps: [{ runnableType: "step", type: "CertApply", input: { sslProvider: "custom", acmeAccountAccessId: 9 } }],
                    },
                  ],
                },
              ],
            }),
          };
        },
      } as any;
      let newBean: any = null;
      service.addOrUpdate = async (bean: any) => {
        bean.id = 100;
        newBean = bean;
        return bean;
      };

      const cert = createSelfSignedCert();
      await service.updateCertByPipelineId(1, cert, "pipeline");

      assert.equal(newBean.acmeAccountAccessId, 9);
    });

    it("updateDomains 保存流水线时为申请任务创建空证书记录（记录任务id）", async () => {
      const service = new CertInfoService();
      service.repository = {
        async find() {
          return [];
        },
        async findOne() {
          return null;
        },
        async delete() {},
      } as any;
      let newBean: any = null;
      service.addOrUpdate = async (bean: any) => {
        newBean = bean;
        bean.id = 100;
        return bean;
      };

      await service.updateDomains(1, 2, 3, [{ taskId: "apply-step-1", domains: ["a.com", "b.com"] }], "auto");

      // 创建了空证书记录（certInfo 为空），绑定流水线/用户/项目/申请任务id与域名信息
      assert.equal(newBean.pipelineId, 1);
      assert.equal(newBean.userId, 2);
      assert.equal(newBean.projectId, 3);
      assert.equal(newBean.fromType, "auto");
      assert.equal(newBean.taskId, "apply-step-1");
      assert.equal(newBean.domain, "a.com");
      assert.equal(newBean.domains, "a.com,b.com");
      assert.equal(newBean.domainCount, 2);
      assert.equal(newBean.certInfo, undefined);
    });

    it("updateDomains 已有 active 记录时更新域名信息，不新建记录", async () => {
      const service = new CertInfoService();
      const existing = { id: 10, pipelineId: 1, userId: 2, projectId: 3, fromType: "auto", taskId: "apply-step-1", status: CertStatus.active };
      service.repository = {
        async find() {
          return [existing];
        },
        async findOne() {
          return existing;
        },
        async delete() {},
      } as any;
      let newBean: any = null;
      service.addOrUpdate = async (bean: any) => {
        newBean = bean;
        bean.id = 10;
        return bean;
      };

      await service.updateDomains(1, 2, 3, [{ taskId: "apply-step-1", domains: ["c.com"] }], "auto");

      // 复用已有记录（保留原 id 与 taskId），只更新域名信息
      assert.equal(newBean.id, 10);
      assert.equal(newBean.domain, "c.com");
      assert.equal(newBean.domains, "c.com");
      assert.equal(newBean.domainCount, 1);
    });

    it("updateDomains 一个流水线多个申请任务时，每个任务维护一条记录", async () => {
      const service = new CertInfoService();
      let findOneCount = 0;
      service.repository = {
        async find() {
          return [];
        },
        async findOne() {
          findOneCount++;
          return null;
        },
        async delete() {},
      } as any;
      const createdBeans: any[] = [];
      service.addOrUpdate = async (bean: any) => {
        createdBeans.push({ ...bean });
        bean.id = 100 + createdBeans.length;
        return bean;
      };

      await service.updateDomains(
        1,
        2,
        3,
        [
          { taskId: "apply-a", domains: ["a.com"] },
          { taskId: "apply-b", domains: ["b.com"] },
        ],
        "auto"
      );

      // 每个申请任务各创建一条 active 记录
      assert.equal(createdBeans.length, 2);
      assert.equal(createdBeans[0].taskId, "apply-a");
      assert.equal(createdBeans[0].domain, "a.com");
      assert.equal(createdBeans[1].taskId, "apply-b");
      assert.equal(createdBeans[1].domain, "b.com");
      assert.equal(createdBeans[0].status, CertStatus.active);
      assert.equal(createdBeans[1].status, CertStatus.active);
    });

    it("updateDomains 删除孤儿 active 记录（流水线中已不存在的任务，含 taskId 为空的遗留记录）", async () => {
      const service = new CertInfoService();
      service.repository = {
        async find() {
          return [];
        },
        async findOne() {
          return null;
        },
      } as any;
      service.addOrUpdate = async (bean: any) => {
        bean.id = 100;
        return bean;
      };
      let deleteWhere: any = null;
      service.repository.delete = async (where: any) => {
        deleteWhere = where;
        return {} as any;
      };

      await service.updateDomains(1, 2, 3, [{ taskId: "apply-b", domains: ["b.com"] }], "auto");

      // 只删除 active 记录：taskId 为 NULL（遗留）或不在流水线中的任务
      assert.equal(deleteWhere.pipelineId, 1);
      assert.equal(deleteWhere.status, CertStatus.active);
      // 孤儿条件：taskId IS NULL 或 NOT IN (流水线中的任务id)
      assert.ok(deleteWhere.taskId != null, "应包含 taskId 孤儿过滤条件");
    });

    it("updateDomains 流水线没有申请任务时，删除该流水线所有 active 记录", async () => {
      const service = new CertInfoService();
      service.repository = {} as any;
      let deleteWhere: any = null;
      service.repository.delete = async (where: any) => {
        deleteWhere = where;
        return {} as any;
      };

      await service.updateDomains(1, 2, 3, [], "pipeline");

      // 没有申请任务 → 该流水线的 active 记录全部清理（无任务可对应）
      assert.equal(deleteWhere.pipelineId, 1);
      assert.equal(deleteWhere.status, CertStatus.active);
    });
  });

  describe("revoke 吊销", () => {
    it("激活状态的证书不允许吊销", async () => {
      const service = new CertInfoService();
      service.info = async () =>
        ({
          id: 1,
          userId: 2,
          projectId: null,
          status: CertStatus.active,
          certInfo: "{}",
        } as any);

      await assert.rejects(() => service.revoke(1, 2), /只有未激活状态的证书才允许执行吊销/);
    });

    it("已吊销的证书不允许重复吊销", async () => {
      const service = new CertInfoService();
      service.info = async () =>
        ({
          id: 1,
          userId: 2,
          projectId: null,
          status: CertStatus.revoked,
          certInfo: "{}",
        } as any);

      await assert.rejects(() => service.revoke(1, 2), /只有未激活状态的证书才允许执行吊销/);
    });

    it("吊销成功后标记为已吊销并记录吊销时间", async () => {
      const service = new CertInfoService();
      const cert = createSelfSignedCert();
      service.info = async () =>
        ({
          id: 1,
          userId: 2,
          projectId: null,
          status: CertStatus.inactive,
          certInfo: JSON.stringify(cert),
          pipelineId: 5,
        } as any);
      service.pipelineRepository = {
        async findOne() {
          return {
            content: JSON.stringify({
              stages: [
                {
                  tasks: [
                    {
                      steps: [{ runnableType: "step", type: "CertApply", input: { sslProvider: "letsencrypt", acmeAccountAccessId: 9 } }],
                    },
                  ],
                },
              ],
            }),
          };
        },
      } as any;
      service.accessService = {
        async getAccessById() {
          return {
            getAccount: () => ({
              accountKey: "account-key",
              accountUri: "https://acme.example.com/acct/1",
              caType: "letsencrypt",
              email: "user@example.com",
              directoryUrl: "https://acme.example.com/directory",
            }),
          };
        },
      } as any;
      let updated: any = null;
      service.repository = {
        async update(where: any, set: any) {
          updated = { where, set };
          return {} as any;
        },
      } as any;

      // mock ACME吊销调用，避免真实网络请求
      const original = AcmeService.prototype.revokeCert;
      let revokeCalled = false;
      AcmeService.prototype.revokeCert = async function () {
        revokeCalled = true;
      };
      try {
        await service.revoke(1, 2);
      } finally {
        AcmeService.prototype.revokeCert = original;
      }

      assert.equal(revokeCalled, true);
      assert.equal(updated.where.id, 1);
      assert.equal(updated.set.status, CertStatus.revoked);
      assert.ok(updated.set.revokeTime > 0);
    });

    it("吊销时优先使用记录上的ACME账号，不再解析流水线", async () => {
      const service = new CertInfoService();
      const cert = createSelfSignedCert();
      service.info = async () =>
        ({
          id: 1,
          userId: 2,
          projectId: null,
          status: CertStatus.inactive,
          certInfo: JSON.stringify(cert),
          pipelineId: 5,
          acmeAccountAccessId: 9,
        } as any);
      // 若吊销仍解析流水线，会触发 pipelineRepository 查询 → 直接抛错证明未走旧逻辑
      service.pipelineRepository = {
        async findOne() {
          throw new Error("吊销不应再查询流水线");
        },
      } as any;
      service.accessService = {
        async getAccessById() {
          return {
            getAccount: () => ({
              accountKey: "account-key",
              accountUri: "https://myca.example.com/acct/1",
              caType: "custom",
              email: "user@example.com",
              directoryUrl: "https://myca.example.com/directory",
            }),
          };
        },
      } as any;
      let updated: any = null;
      service.repository = {
        async update(where: any, set: any) {
          updated = { where, set };
          return {} as any;
        },
      } as any;

      const original = AcmeService.prototype.revokeCert;
      let revokeArgs: any = null;
      AcmeService.prototype.revokeCert = async function (args: any) {
        revokeArgs = args;
      };
      try {
        await service.revoke(1, 2);
      } finally {
        AcmeService.prototype.revokeCert = original;
      }

      assert.equal(revokeArgs.acmeAccount.accountUri, "https://myca.example.com/acct/1");
      assert.equal(updated.set.status, CertStatus.revoked);
    });

    it("未找到关联流水线配置时无法吊销", async () => {
      const service = new CertInfoService();
      const cert = createSelfSignedCert();
      service.info = async () =>
        ({
          id: 1,
          userId: 2,
          projectId: null,
          status: CertStatus.inactive,
          certInfo: JSON.stringify(cert),
          pipelineId: 5,
        } as any);
      service.pipelineRepository = {
        async findOne() {
          return null;
        },
      } as any;
      service.repository = {
        async update() {},
      } as any;

      await assert.rejects(() => service.revoke(1, 2), /无法确定证书颁发机构/);
    });
  });
});
