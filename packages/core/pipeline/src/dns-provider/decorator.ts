// src/decorator/memoryCache.decorator.ts
import { dnsProviderRegistry } from "./registry";
import { DnsProviderDefine } from "./api";
import { Decorator } from "../decorator";

// 提供一个唯一 key
export const DNS_PROVIDER_CLASS_KEY = "pipeline:dns-provider";

export function IsDnsProvider(define: DnsProviderDefine): ClassDecorator {
  return (target: any) => {
    target = Decorator.target(target);
    Reflect.defineMetadata(DNS_PROVIDER_CLASS_KEY, define, target);

    target.define = define;
    dnsProviderRegistry.register(define.name, {
      define,
      target,
    });
  };
}
