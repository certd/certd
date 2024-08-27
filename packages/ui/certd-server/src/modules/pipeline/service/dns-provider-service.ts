import { Provide } from '@midwayjs/core';
import { dnsProviderRegistry } from '@certd/plugin-cert';

@Provide()
export class DnsProviderService {
  getList() {
    return dnsProviderRegistry.getDefineList();
  }
}
