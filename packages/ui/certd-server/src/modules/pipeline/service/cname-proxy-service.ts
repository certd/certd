import { CnameRecord, ICnameProxyService } from '@certd/pipeline';

export class CnameProxyService implements ICnameProxyService {
  userId: number;
  getter: <T>(domain: string, userId?: number) => Promise<T>;
  constructor(userId: number, getter: (domain: string, userId: number) => Promise<any>) {
    this.userId = userId;
    this.getter = getter;
  }

  getByDomain(domain: string): Promise<CnameRecord> {
    return this.getter<CnameRecord>(domain, this.userId);
  }
}
