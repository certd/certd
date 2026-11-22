import { LocalCaKeyType, LocalCaUsage } from "./local-ca-crypto.js";
import { LocalCaService } from "./local-ca-service.js";

/**
 * 流水线/ACME 场景下的 CA 访问入口。
 * userId/projectId 在构造时固定，避免插件跨用户选择 CA。
 */
export class LocalCaGetter {
  private userId: number;
  private projectId?: number;
  private service: LocalCaService;

  constructor(userId: number, projectId: number | undefined, service: LocalCaService) {
    this.userId = userId;
    this.projectId = projectId;
    this.service = service;
  }

  async getCa(id: number) {
    return await this.service.infoSafe({ id, userId: this.userId, projectId: this.projectId });
  }

  async listOptions(searchKey?: string) {
    return await this.service.listOptions({
      userId: this.userId,
      projectId: this.projectId,
      searchKey,
    });
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
