import { LocalCaKeyType, LocalCaUsage } from "./local-ca-crypto.js";
import { LocalCaService } from "./local-ca-service.js";

/**
 * 本地CA签发能力入口。
 * 仅允许内置 CertApplyLocalCa 插件通过 ServiceGetter 获取，避免其他插件调用签发。
 */
export class LocalCaSignerGetter {
  private userId: number;
  private projectId?: number;
  private service: LocalCaService;

  constructor(userId: number, projectId: number | undefined, service: LocalCaService) {
    this.userId = userId;
    this.projectId = projectId;
    this.service = service;
  }

  async signCsr(req: { caId: number; csrPem: string; validityDays?: number; usage?: LocalCaUsage }) {
    return await this.service.signCsr({
      id: req.caId,
      csrPem: req.csrPem,
      validityDays: req.validityDays,
      usage: req.usage,
      userId: this.userId,
      projectId: this.projectId,
    });
  }

  async issueLeaf(req: { caId: number; domains: string[]; keyType?: LocalCaKeyType; validityDays?: number; usage?: LocalCaUsage }) {
    return await this.service.issueLeaf({
      id: req.caId,
      domains: req.domains,
      keyType: req.keyType,
      validityDays: req.validityDays,
      usage: req.usage,
      userId: this.userId,
      projectId: this.projectId,
    });
  }
}
