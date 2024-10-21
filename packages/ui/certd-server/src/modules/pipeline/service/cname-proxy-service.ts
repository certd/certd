import { CnameRecord, ICnameProxyService } from '@certd/pipeline';

export class CnameProxyService implements ICnameProxyService {
  userId: number;
  getter: <T>(domain: string, userId?: number) => Promise<T>;
  constructor(userId: number, getter: (domain: string, userId: number) => Promise<any>) {
    this.userId = userId;
    this.getter = getter;
  }

  async getByDomain(domain: string): Promise<CnameRecord> {
    return await this.getter<CnameRecord>(domain, this.userId);
  }
}
