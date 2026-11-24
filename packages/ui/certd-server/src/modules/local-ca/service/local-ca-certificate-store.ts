import { Inject, Provide } from "@midwayjs/core";
import type { EntityManager } from "typeorm";
import { CertReader } from "@certd/plugin-lib";
import { logger } from "@certd/basic";
import type { AcmeIssuedCertificateStore } from "../../acme-server/acme-issued-certificate-store.js";
import { CertInfoService } from "../../monitor/service/cert-info-service.js";
import { CertInfoEntity, CertStatus } from "../../monitor/entity/cert-info.js";

/**
 * Certd 证书仓库集成适配器：负责 ACME 签发证书的保存/查询/吊销。
 */
@Provide("acmeIssuedCertificateStore")
export class LocalCaCertificateStore implements AcmeIssuedCertificateStore {
  @Inject()
  certInfoService: CertInfoService;

  async saveIssuedCertificate(input: { caId: number; serialNumber: string; fullchainPem: string; userId?: number; projectId?: number; domainsFallback?: string[] }, manager?: EntityManager) {
    if (!input.userId || input.userId <= 0) {
      logger.info(`[acme] system-level certificate not saved to user repo ca=${input.caId}`);
      return;
    }
    const reader = new CertReader({ crt: input.fullchainPem, key: "" });
    const domains = reader.detail.domains.altNames?.length ? reader.detail.domains.altNames : input.domainsFallback || [];
    const bean = new CertInfoEntity();
    bean.userId = input.userId;
    bean.projectId = input.projectId;
    bean.domain = domains[0] || "";
    bean.domains = domains.join(",");
    bean.domainCount = domains.length;
    bean.wildcardDomainCount = domains.filter(item => item.startsWith("*.")).length;
    bean.applyTime = Date.now();
    bean.fromType = "acme";
    bean.certProvider = reader.detail.issuer.commonName;
    bean.effectiveTime = reader.effective;
    bean.expiresTime = reader.expires;
    bean.certInfo = JSON.stringify({ crt: input.fullchainPem, key: "" });
    bean.localCaId = input.caId;
    bean.serialNumber = input.serialNumber;
    bean.status = CertStatus.active;
    const repository = manager ? manager.getRepository(CertInfoEntity) : this.certInfoService.repository;
    await repository.save(bean);
  }

  findIssuedCertificate(caId: number, serialNumber: string) {
    return this.certInfoService.findOne({ where: { localCaId: caId, serialNumber } });
  }

  revokeIssuedCertificate(req: { certInfoId: number; caId: number; userId: number; projectId?: number; serialNumber: string; expiresTime?: number }) {
    return this.certInfoService.applyLocalRevocation(req);
  }
}
