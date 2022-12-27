// src/decorator/memoryCache.decorator.ts
import {
  attachClassMetadata,
  attachPropertyDataToClass,
  getClassMetadata,
  listModule,
  listPropertyDataFromClass,
  saveClassMetadata,
  saveModule,
} from "@midwayjs/decorator";
import { AccessDefine, AccessInputDefine } from "./api";
import _ from "lodash-es";
import { accessRegistry } from "./registry";

// 提供一个唯一 key
export const ACCESS_CLASS_KEY = "decorator:access";

export function IsAccess(define: AccessDefine): ClassDecorator {
  console.log("is access define:", define);
  return (target: any) => {
    console.log("is access load:", target);
    // 将装饰的类，绑定到该装饰器，用于后续能获取到 class
    saveModule(ACCESS_CLASS_KEY, target);
    // 保存一些元数据信息，任意你希望存的东西
    saveClassMetadata(
      ACCESS_CLASS_KEY,
      {
        define,
      },
      target
    );
  };
}

export const ACCESS_INPUT_KEY = "decorator:access:input";

export function IsAccessInput(input?: AccessInputDefine): PropertyDecorator {
  return (target, propertyKey) => {
    attachPropertyDataToClass(ACCESS_INPUT_KEY, { input }, target, propertyKey, propertyKey as string);

    attachClassMetadata(
      ACCESS_CLASS_KEY,
      {
        inputs: {
          [propertyKey]: input,
        },
      },
      target
    );
  };
}

export function registerAccess() {
  const modules = listModule(ACCESS_CLASS_KEY);
  for (const mod of modules) {
    console.log("mod", mod);
    const define = getClassMetadata(ACCESS_CLASS_KEY, mod);
    console.log("define", define);
    const inputs = listPropertyDataFromClass(ACCESS_INPUT_KEY, mod);
    console.log("inputs", inputs);
    for (const input of inputs) {
      define.inputs = {};
      _.merge(define.inputs, input.inputs);
    }

    accessRegistry.register(define.name, {
      define,
      target: mod,
    });
  }
}
