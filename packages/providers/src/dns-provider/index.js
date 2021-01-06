import { AliyunDnsProvider } from './impl/aliyun.js'
import { DnspodDnsProvider } from './impl/dnspod.js'
export default {
  [AliyunDnsProvider.name()]: AliyunDnsProvider,
  [DnspodDnsProvider.name()]: DnspodDnsProvider
}
