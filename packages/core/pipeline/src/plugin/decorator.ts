import _ from "lodash-es";
import { pluginRegistry } from "./registry.js";
import { PluginDefine, TaskInputDefine, TaskOutputDefine } from "./api.js";
import { Decorator } from "../decorator/index.js";
import { AUTOWIRE_KEY } from "../decorator/index.js";
import "reflect-metadata";
// 提供一个唯一 key
export const PLUGIN_CLASS_KEY = "pipeline:plugin";

export function IsTaskPlugin(define: PluginDefine): ClassDecorator {
  return (target: any) => {
    target = Decorator.target(target);

    const inputs: any = {};
    const autowires: any = {};
    const outputs: any = {};
    const properties = Decorator.getClassProperties(target);
    for (const property in properties) {
      const input = Reflect.getMetadata(PLUGIN_INPUT_KEY, target, property);
      if (input) {
        inputs[property] = input;
      }

      const autowire = Reflect.getMetadata(AUTOWIRE_KEY, target, property);
      if (autowire) {
        autowires[property] = autowire;
      }

      const output = Reflect.getMetadata(PLUGIN_OUTPUT_KEY, target, property);
      if (output) {
        outputs[property] = output;
      }
    }

    // inputs 转换为array，根据order排序，然后再转换为map

    let inputArray = [];
    for (const key in inputs) {
      const _input = inputs[key];
      if (_input.order == null) {
        _input.order = 0;
      }
      inputArray.push([key, _input]);
    }
    inputArray = _.sortBy(inputArray, (item: any) => item[1].order);
    const inputMap: any = {};
    inputArray.forEach((item: any) => {
      inputMap[item[0]] = item[1];
    });

    _.merge(define, { input: inputMap, autowire: autowires, output: outputs });

    Reflect.defineMetadata(PLUGIN_CLASS_KEY, define, target);

    target.define = define;
    pluginRegistry.register(define.name, {
      define,
      target,
    });
  };
}

export const PLUGIN_INPUT_KEY = "pipeline:plugin:input";

export function TaskInput(input?: TaskInputDefine): PropertyDecorator {
  return (target, propertyKey) => {
    target = Decorator.target(target, propertyKey);
    Reflect.defineMetadata(PLUGIN_INPUT_KEY, input, target, propertyKey);
  };
}

// 装饰器内部的唯一 id
export const PLUGIN_OUTPUT_KEY = "pipeline:plugin:output";
export function TaskOutput(output?: TaskOutputDefine): PropertyDecorator {
  return (target, propertyKey) => {
    target = Decorator.target(target, propertyKey);
    Reflect.defineMetadata(PLUGIN_OUTPUT_KEY, output, target, propertyKey);
  };
}

export const PLUGIN_DOWNLOAD_KEY = "pipeline:plugin:download";
export function TaskDownload(output?: TaskOutputDefine): PropertyDecorator {
  return (target, propertyKey) => {
    target = Decorator.target(target, propertyKey);
    Reflect.defineMetadata(PLUGIN_DOWNLOAD_KEY, output, target, propertyKey);
  };
}
