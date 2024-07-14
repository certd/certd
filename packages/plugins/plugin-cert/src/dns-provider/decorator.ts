import { dnsProviderRegistry } from "./registry.js";
import { DnsProviderDefine } from "./api.js";
import { Decorator, AUTOWIRE_KEY } from "@certd/pipeline";
import _ from "lodash-es";

// 提供一个唯一 key
export const DNS_PROVIDER_CLASS_KEY = "pipeline:dns-provider";

export function IsDnsProvider(define: DnsProviderDefine): ClassDecorator {
  return (target: any) => {
    target = Decorator.target(target);
    const autowires: any = {};
    const properties = Decorator.getClassProperties(target);
    for (const property in properties) {
      const autowire = Reflect.getMetadata(AUTOWIRE_KEY, target, property);
      if (autowire) {
        autowires[property] = autowire;
      }
    }
    _.merge(define, { autowire: autowires });

    Reflect.defineMetadata(DNS_PROVIDER_CLASS_KEY, define, target);

    target.define = define;
    dnsProviderRegistry.register(define.name, {
      define,
      target,
    });
  };
}
