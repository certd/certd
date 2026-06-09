import { IAccessService } from "@certd/pipeline";

export class AccessGetter implements IAccessService {
  userId: number;
  projectId?: number;
  getter: <T>(id: any, userId?: number, projectId?: number, ignorePermission?: boolean) => Promise<T>;
  constructor(userId: number, projectId: number, getter: (id: any, userId: number, projectId?: number, ignorePermission?: boolean) => Promise<any>) {
    this.userId = userId;
    this.projectId = projectId;
    this.getter = getter;
  }

  async getById<T = any>(id: any) {
    return await this.getter<T>(id, this.userId, this.projectId);
  }

  async getCommonById<T = any>(id: any) {
    return await this.getter<T>(id, 0, null);
  }
}
