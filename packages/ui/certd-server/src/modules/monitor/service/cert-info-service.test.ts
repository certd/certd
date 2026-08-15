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

describe("CertInfoService", () => {
  it("counts wildcard domains by normalized prefix", () => {
    const service = new CertInfoService();

    assert.equal(service.countWildcardDomains(["*.a.com", "a.com", " *.B.com "]), 2);
  });

  describe("updateCertByPipelineId 多条模式", () => {
    it("新建激活证书并绑定流水线id、继承已有记录来源", async () => {
      const service = new CertInfoService();
      // 该流水线已有旧证书记录（upload 来源）
      const existing = { id: 10, userId: 2, projectId: 3, pipelineId: 1, fromType: "upload", status: CertStatus.inactive };
      service.repository = {
        async findOne() {
          return existing;
        },
        async delete() {},
        async update() {},
      } as any;
      service.pipelineRepository = {
        async findOne() {
          return null;
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
      const service = new CertInfoService();
      service.repository = {
        async findOne() {
          return null;
        },
        async delete() {},
      } as any;
      service.pipelineRepository = {
        async findOne() {
          return { type: "cert_upload" };
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
      const bean = await service.updateCertByPipelineId(1, cert, "pipeline", 2, 3);

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
      const service = new CertInfoService();
      service.repository = {
        async findOne() {
          return null;
        },
        async delete() {},
        async update() {},
      } as any;
      service.pipelineRepository = {
        async findOne() {
          return { type: "custom" };
        },
      } as any;
      service.addOrUpdate = async (bean: any) => {
        bean.id = 100;
        return bean;
      };

      const cert = createSelfSignedCert();
      const bean = await service.updateCertByPipelineId(1, cert, "pipeline", 2, 3);

      assert.equal(bean.fromType, "pipeline");
      assert.equal(bean.pipelineId, 1);
    });

    it("清理该流水线残留的空占位记录", async () => {
      const service = new CertInfoService();
      // 历史占位记录（无证书内容）
      const existing = { id: 10, userId: 2, projectId: null, pipelineId: 1, fromType: "pipeline", status: CertStatus.active, certInfo: null };
      service.repository = {
        async findOne() {
          return existing;
        },
        async update() {},
      } as any;
      service.pipelineRepository = {
        async findOne() {
          return null;
        },
      } as any;
      let deleteWhere: any = null;
      service.repository.delete = async (where: any) => {
        deleteWhere = where;
        return {} as any;
      };
      service.addOrUpdate = async (bean: any) => {
        bean.id = 100;
        return bean;
      };

      const cert = createSelfSignedCert();
      await service.updateCertByPipelineId(1, cert);

      assert.equal(deleteWhere.pipelineId, 1);
      assert.equal(deleteWhere.certInfo._type, "isNull");
      assert.equal(deleteWhere.id._value, 100);
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
        }) as any;

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
        }) as any;

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
        }) as any;
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
        }) as any;
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
