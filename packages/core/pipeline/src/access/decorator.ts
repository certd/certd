// src/decorator/memoryCache.decorator.ts
import { AccessDefine, AccessInputDefine } from "./api.js";
import { Decorator } from "../decorator/index.js";
import _ from "lodash-es";
import { accessRegistry } from "./registry.js";

// 提供一个唯一 key
export const ACCESS_CLASS_KEY = "pipeline:access";
export const ACCESS_INPUT_KEY = "pipeline:access:input";

export function IsAccess(define: AccessDefine): ClassDecorator {
  return (target: any) => {
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
      target,
    });
  };
}

export function AccessInput(input?: AccessInputDefine): PropertyDecorator {
  return (target, propertyKey) => {
    target = Decorator.target(target, propertyKey);
    // const _type = Reflect.getMetadata("design:type", target, propertyKey);
    Reflect.defineMetadata(ACCESS_INPUT_KEY, input, target, propertyKey);
  };
}
