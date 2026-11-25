import type { EntityManager } from "typeorm";

/**
 * ACME 协议层依赖的签发后端接口。
 * 协议/订单/账户/EAB 流程不感知具体 CA 实现；Local CA 通过适配器提供该能力。
 */
export interface AcmeCaView {
  id: number;
  caType?: string;
  certPem?: string;
  allowedDomains?: string | null;
  acmeEnabled?: boolean;
  acmeConfig?: string | null;
  baseUrl?: string | null;
  dnsServer?: string | null;
  notAfter?: number;
  disabled?: boolean;
  revoked?: boolean;
}

export interface AcmeIssuerBackend {
  getAcmeCa(caId: number): Promise<AcmeCaView>;
  getAcmeAccessView(caId: number): Promise<AcmeCaView | null>;
  getAcmeCaForUpdate(caId: number, manager: EntityManager): Promise<AcmeCaView>;
  getCaForAcmeRevocation(caId: number): Promise<AcmeCaView>;
  getCaBaseUrl(caId: number): Promise<string>;
  markBaseUrlLocked(caId: number, manager?: EntityManager): Promise<void>;
  signCsrForAcme(caId: number, csrPem: string, validityDays: number, manager?: EntityManager): Promise<{ fullchainPem: string; serialNumber: string; certPem?: string }>;
  getAcmeEabSecret(caId: number, kid: string): Promise<any>;
  getAcmeEabProfile(eabId: string, manager?: EntityManager): Promise<{ id: string; allowedDomains: string[]; privileged: boolean } | null>;
  consumeAcmeEab(eabId: string, manager?: EntityManager): Promise<boolean>;
  recordSystemCertRevocation(req: { caId: number; serialNumber: string; expiresTime?: number; userId?: number; projectId?: number; certPem?: string }): Promise<any>;
  assertCaOwner(req: { id: number; userId: number; projectId?: number }, includeDeleted?: boolean): Promise<void>;
}
