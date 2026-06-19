import { IAccessService } from "@certd/pipeline";

export type AccessRuntimeDepsService = {
  ensureRuntimeDependencies(pluginKeys: string | string[]): Promise<any>;
  importRuntime(specifier: string): Promise<any>;
};

export class AccessGetter implements IAccessService {
  userId: number;
  projectId?: number;
  runtimeDepsService?: AccessRuntimeDepsService;
  getter: <T>(id: any, userId?: number, projectId?: number, ignorePermission?: boolean, runtimeDepsService?: AccessRuntimeDepsService) => Promise<T>;
  constructor(
    userId: number,
    projectId: number,
    getter: (id: any, userId: number, projectId?: number, ignorePermission?: boolean, runtimeDepsService?: AccessRuntimeDepsService) => Promise<any>,
    runtimeDepsService?: AccessRuntimeDepsService
  ) {
    this.userId = userId;
    this.projectId = projectId;
    this.getter = getter;
    this.runtimeDepsService = runtimeDepsService;
  }

  async getById<T = any>(id: any) {
    return await this.getter<T>(id, this.userId, this.projectId, false, this.runtimeDepsService);
  }

  async getCommonById<T = any>(id: any) {
    return await this.getter<T>(id, 0, null, false, this.runtimeDepsService);
  }
}
