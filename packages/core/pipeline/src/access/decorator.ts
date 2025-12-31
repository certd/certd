// src/decorator/memoryCache.decorator.ts
import { AccessContext, AccessDefine, AccessInputDefine, IAccessService } from "./api.js";
import { Decorator } from "../decorator/index.js";
import * as _ from "lodash-es";
import { accessRegistry } from "./registry.js";
import { http, logger, utils } from "@certd/basic";

// 提供一个唯一 key
export const ACCESS_CLASS_KEY = "pipeline:access";
export const ACCESS_INPUT_KEY = "pipeline:access:input";

export function IsAccess(define: AccessDefine): ClassDecorator {
  return (target: any) => {
    if (process.env.certd_plugin_loadmode === "metadata") {
      return;
    }
    target = Decorator.target(target);

    const inputs: any = {};
    const properties = Decorator.getClassProperties(target);
    for (const property in properties) {
      const input = Reflect.getMetadata(ACCESS_INPUT_KEY, target, property);
      if (input) {
        inputs[property] = input;
      }
    }
    _.merge(define, { input: inputs });
    Reflect.defineMetadata(ACCESS_CLASS_KEY, define, target);
    target.define = define;
    accessRegistry.register(define.name, {
      define,
      target: async () => {
        return target;
      },
    });
  };
}

export function AccessInput(input?: AccessInputDefine): PropertyDecorator {
  return (target, propertyKey) => {
    if (process.env.certd_plugin_loadmode === "metadata") {
      return;
    }
    target = Decorator.target(target, propertyKey);
    // const _type = Reflect.getMetadata("design:type", target, propertyKey);
    Reflect.defineMetadata(ACCESS_INPUT_KEY, input, target, propertyKey);
  };
}

export async function newAccess(type: string, input: any, accessService: IAccessService, ctx?: AccessContext) {
  const register = accessRegistry.get(type);
  if (register == null) {
    throw new Error(`access ${type} not found`);
  }
  // @ts-ignore
  const accessCls = await register.target();
  // @ts-ignore
  const access = new accessCls();
  for (const key in input) {
    access[key] = input[key];
  }
  if (!ctx) {
    ctx = {
      http,
      logger,
      utils,
      accessService,
    };
  }
  access.setCtx(ctx);
  access._type = type;
  return access;
}
