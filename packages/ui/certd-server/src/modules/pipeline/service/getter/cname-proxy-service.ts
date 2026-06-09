import { CnameRecord, ICnameProxyService } from "@certd/pipeline";

export class CnameProxyService implements ICnameProxyService {
  userId: number;
  projectId: number;
  getter: <T>(domain: string, userId?: number, projectId?: number) => Promise<T>;
  constructor(userId: number, projectId: number, getter: (domain: string, userId: number, projectId: number) => Promise<any>) {
    this.userId = userId;
    this.projectId = projectId;
    this.getter = getter;
  }

  async getByDomain(domain: string): Promise<CnameRecord> {
    return await this.getter<CnameRecord>(domain, this.userId, this.projectId);
  }
}
