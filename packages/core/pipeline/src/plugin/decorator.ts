import _ from "lodash";
import { pluginRegistry } from "./registry";
import { PluginDefine, TaskInputDefine, TaskOutputDefine } from "./api";
import { Decorator } from "../decorator";

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

      const autowire = Reflect.getMetadata(PLUGIN_AUTOWIRE_KEY, target, property);
      if (autowire) {
        autowires[property] = autowire;
      }

      const output = Reflect.getMetadata(PLUGIN_OUTPUT_KEY, target, property);
      if (output) {
        outputs[property] = output;
      }
    }
    _.merge(define, { input: inputs, autowire: autowires, output: outputs });

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

export type AutowireProp = {
  name?: string;
  type?: any;
};
export const PLUGIN_AUTOWIRE_KEY = "pipeline:plugin:autowire";

export function Autowire(props?: AutowireProp): PropertyDecorator {
  return (target, propertyKey) => {
    const _type = Reflect.getMetadata("design:type", target, propertyKey);
    target = Decorator.target(target, propertyKey);
    props = props || {};
    props.type = _type;
    Reflect.defineMetadata(PLUGIN_AUTOWIRE_KEY, props || {}, target, propertyKey);
  };
}
