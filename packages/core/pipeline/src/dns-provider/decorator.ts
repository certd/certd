// src/decorator/memoryCache.decorator.ts
import { getClassMetadata, listModule, Provide, saveClassMetadata, saveModule, Scope, ScopeEnum } from "@midwayjs/decorator";
import { dnsProviderRegistry } from "./registry";
import { DnsProviderDefine } from "./api";

// 提供一个唯一 key
export const DNS_PROVIDER_CLASS_KEY = "decorator:dnsProvider";

export function IsDnsProvider(define: DnsProviderDefine): ClassDecorator {
  console.log("is task plugin define:", define);
  return (target: any) => {
    console.log("is task plugin load:", target);
    // 将装饰的类，绑定到该装饰器，用于后续能获取到 class
    saveModule(DNS_PROVIDER_CLASS_KEY, target);
    // 保存一些元数据信息，任意你希望存的东西
    saveClassMetadata(
      DNS_PROVIDER_CLASS_KEY,
      {
        define,
      },
      target
    );
    // 指定 IoC 容器创建实例的作用域，这里注册为请求作用域，这样能取到 ctx
    Scope(ScopeEnum.Prototype)(target);

    // 调用一下 Provide 装饰器，这样用户的 class 可以省略写 @Provide() 装饰器了
    Provide()(target);
  };
}

export function registerDnsProviders() {
  const modules = listModule(DNS_PROVIDER_CLASS_KEY);
  for (const mod of modules) {
    console.log("mod", mod);
    const define = getClassMetadata(DNS_PROVIDER_CLASS_KEY, mod);
    console.log("define", define);
    dnsProviderRegistry.register(define.name, {
      define,
      target: mod,
    });
  }
}
