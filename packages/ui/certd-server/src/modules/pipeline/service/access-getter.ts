import { IAccessService } from '@certd/pipeline';

export class AccessGetter implements IAccessService {
  userId: number;
  getter: <T>(id: any, userId?: number) => Promise<T>;
  constructor(userId: number, getter: (id: any, userId: number) => Promise<any>) {
    this.userId = userId;
    this.getter = getter;
  }

  async getById<T = any>(id: any) {
    return await this.getter<T>(id, this.userId);
  }

  async getCommonById<T = any>(id: any) {
    return await this.getter<T>(id, 0);
  }
}
