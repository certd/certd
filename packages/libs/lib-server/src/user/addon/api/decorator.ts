// src/decorator/memoryCache.decorator.ts
import * as _ from "lodash-es";
import { merge } from "lodash-es";
import { addonRegistry } from "./registry.js";
import { AddonContext, AddonDefine, AddonInputDefine } from "./api.js";
import { Decorator } from "@certd/pipeline";

// 提供一个唯一 key
export const ADDON_CLASS_KEY = "pipeline:addon";
export const ADDON_INPUT_KEY = "pipeline:addon:input";

export function IsAddon(define: AddonDefine): ClassDecorator {
  return (target: any) => {
    if (process.env.certd_plugin_loadmode === "metadata") {
      return;
    }
    target = Decorator.target(target);

    const inputs: any = {};
    const properties = Decorator.getClassProperties(target);
    for (const property in properties) {
      const input = Reflect.getMetadata(ADDON_INPUT_KEY, target, property);
      if (input) {
        inputs[property] = input;
      }
    }
    _.merge(define, { input: inputs });
    Reflect.defineMetadata(ADDON_CLASS_KEY, define, target);
    target.define = define;
    const key = `${define.addonType}:${define.name}`;
    addonRegistry.register(key, {
      define,
      target: async () => {
        return target;
      },
    });
  };
}

export function AddonInput(input?: AddonInputDefine): PropertyDecorator {
  return (target, propertyKey) => {
    if (process.env.certd_plugin_loadmode === "metadata") {
      return;
    }
    target = Decorator.target(target, propertyKey);
    // const _type = Reflect.getMetadata("design:type", target, propertyKey);
    Reflect.defineMetadata(ADDON_INPUT_KEY, input, target, propertyKey);
  };
}

export async function newAddon(addonType:string,type: string, input: any, ctx: AddonContext) {
 const key = `${addonType}:${type}`
  const register = addonRegistry.get(key);
  if (register == null) {
    throw new Error(`${addonType} ${type} not found`);
  }
  // @ts-ignore
  const pluginCls = await register.target();
  // @ts-ignore
  const plugin = new pluginCls();
  merge(plugin, input);
  if (!ctx) {
    throw new Error("ctx is required");
  }
  plugin.setDefine(register.define);
  plugin.setCtx(ctx);
  await plugin.onInstance();
  return plugin;
}


