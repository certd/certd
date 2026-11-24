import type { EntityManager } from "typeorm";

/**
 * ACME 签发证书持久化接口。协议层不感知 Certd 证书仓库实现。
 */
export interface AcmeIssuedCertificateStore {
  saveIssuedCertificate(
    input: {
      caId: number;
      serialNumber: string;
      fullchainPem: string;
      userId?: number;
      projectId?: number;
      domainsFallback?: string[];
    },
    manager?: EntityManager
  ): Promise<void>;
  findIssuedCertificate(caId: number, serialNumber: string): Promise<{ id: number; userId: number; projectId?: number; expiresTime?: number } | null>;
  revokeIssuedCertificate(req: { certInfoId: number; caId: number; userId: number; projectId?: number; serialNumber: string; expiresTime?: number }): Promise<any>;
}
