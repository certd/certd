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
    return await this.service.getUserCa({ id, userId: this.userId, projectId: this.projectId });
  }

  async listOptions(searchKey?: string) {
    return await this.service.listOptions({
      userId: this.userId,
      projectId: this.projectId,
      searchKey,
    });
  }
}
