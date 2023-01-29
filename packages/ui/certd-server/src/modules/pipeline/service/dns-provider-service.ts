import { Provide, Scope, ScopeEnum } from "@midwayjs/decorator";
import { dnsProviderRegistry } from '@certd/plugin-cert';
@Provide()
@Scope(ScopeEnum.Singleton)
export class DnsProviderService {
  getList() {
    return dnsProviderRegistry.getDefineList();
  }
}
