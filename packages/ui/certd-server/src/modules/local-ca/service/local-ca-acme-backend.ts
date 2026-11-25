import { Inject, Provide } from "@midwayjs/core";
import type { EntityManager } from "typeorm";
import type { AcmeIssuerBackend } from "../../acme-server/acme-issuer-backend.js";
import { LocalCaService } from "./local-ca-service.js";

/**
 * Local CA 对 ACME 协议层的集成适配器。
 */
@Provide("acmeIssuerBackend")
export class LocalCaAcmeBackend implements AcmeIssuerBackend {
  @Inject()
  localCaService: LocalCaService;

  async getAcmeCa(caId: number) {
    const view = await this.localCaService.getAcmeCa(caId);
    if (view) {
      view.dnsServer = await this.localCaService.resolveEffectiveDnsServer(view as any);
    }
    return view;
  }
  getAcmeAccessView(caId: number) {
    return this.localCaService.getAcmeAccessView(caId);
  }
  async getAcmeCaForUpdate(caId: number, manager: EntityManager) {
    const view = await this.localCaService.getAcmeCaForUpdate(caId, manager);
    if (view) {
      view.dnsServer = await this.localCaService.resolveEffectiveDnsServer(view as any);
    }
    return view;
  }
  getCaForAcmeRevocation(caId: number) {
    return this.localCaService.getCaForAcmeRevocation(caId);
  }
  getCaBaseUrl(caId: number) {
    return this.localCaService.getCaBaseUrl(caId);
  }
  markBaseUrlLocked(caId: number, manager?: EntityManager) {
    return this.localCaService.markBaseUrlLocked(caId, manager);
  }
  signCsrForAcme(caId: number, csrPem: string, validityDays: number, manager?: EntityManager) {
    return this.localCaService.signCsrForAcme(caId, csrPem, validityDays, manager);
  }
  getAcmeEabSecret(caId: number, kid: string) {
    return this.localCaService.getAcmeEabSecret(caId, kid);
  }
  getAcmeEabProfile(eabId: string, manager?: EntityManager) {
    return this.localCaService.getAcmeEabProfile(eabId, manager);
  }
  consumeAcmeEab(eabId: string, manager?: EntityManager) {
    return this.localCaService.consumeAcmeEab(eabId, manager);
  }
  recordSystemCertRevocation(req: { caId: number; serialNumber: string; expiresTime?: number; userId?: number; projectId?: number; certPem?: string }) {
    return this.localCaService.recordSystemCertRevocation(req);
  }
  assertCaOwner(req: { id: number; userId: number; projectId?: number }) {
    return this.localCaService.assertCaOwner(req);
  }
}
