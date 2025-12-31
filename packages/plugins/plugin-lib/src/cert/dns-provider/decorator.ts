import { dnsProviderRegistry } from "./registry.js";
import { DnsProviderDefine } from "./api.js";
import { Decorator } from "@certd/pipeline";
import * as _ from "lodash-es";

// 提供一个唯一 key
export const DNS_PROVIDER_CLASS_KEY = "pipeline:dns-provider";

export function IsDnsProvider(define: DnsProviderDefine): ClassDecorator {
  return (target: any) => {
    if (process.env.certd_plugin_loadmode === "metadata") {
      return;
    }
    target = Decorator.target(target);

    Reflect.defineMetadata(DNS_PROVIDER_CLASS_KEY, define, target);

    target.define = define;
    dnsProviderRegistry.register(define.name, {
      define,
      target: async () => {
        return target;
      },
    });
  };
}
