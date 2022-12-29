import {
  attachClassMetadata,
  attachPropertyDataToClass,
  getClassMetadata,
  listModule,
  listPropertyDataFromClass,
  saveClassMetadata,
  saveModule,
} from "@midwayjs/decorator";
import _ from "lodash";
import { pluginRegistry } from "./registry";
import { PluginDefine, TaskInputDefine, TaskOutputDefine } from "./api";

// 提供一个唯一 key
export const PLUGIN_CLASS_KEY = "decorator:plugin";

export function IsTaskPlugin(define: PluginDefine): ClassDecorator {
  console.log("is task plugin define:", define);
  return (target: any) => {
    console.log("is task plugin load:", target);
    // 将装饰的类，绑定到该装饰器，用于后续能获取到 class
    saveModule(PLUGIN_CLASS_KEY, target);
    // 保存一些元数据信息，任意你希望存的东西
    saveClassMetadata(
      PLUGIN_CLASS_KEY,
      {
        define,
      },
      target
    );
    // // 指定 IoC 容器创建实例的作用域，这里注册为请求作用域，这样能取到 ctx
    // Scope(ScopeEnum.Prototype)(target);

    // 调用一下 Provide 装饰器，这样用户的 class 可以省略写 @Provide() 装饰器了
    // Provide()(target);
  };
}

export const PLUGIN_INPUT_KEY = "decorator:plugin:input";

export function TaskInput(input?: TaskInputDefine): PropertyDecorator {
  return (target, propertyKey) => {
    attachPropertyDataToClass(PLUGIN_INPUT_KEY, { input }, target, propertyKey, propertyKey as string);

    attachClassMetadata(
      PLUGIN_CLASS_KEY,
      {
        inputs: {
          [propertyKey]: input,
        },
      },
      target
    );
  };
  //
  // return createCustomPropertyDecorator(CLASS_PROPS_KEY, {
  //   input,
  // });
}

// 装饰器内部的唯一 id
export const PLUGIN_OUTPUT_KEY = "decorator:plugin:output";
export function TaskOutput(output?: TaskOutputDefine): PropertyDecorator {
  return (target, propertyKey) => {
    attachPropertyDataToClass(PLUGIN_OUTPUT_KEY, { output }, target, propertyKey, propertyKey as string);

    attachClassMetadata(
      PLUGIN_CLASS_KEY,
      {
        outputs: {
          [propertyKey]: output,
        },
      },
      target
    );
  };
  //
  // return createCustomPropertyDecorator(CLASS_PROPS_KEY, {
  //   input,
  // });
}

export type AutowireProp = {
  name?: string;
};
export const PLUGIN_AUTOWIRE_KEY = "decorator:plugin:autowire";

export function Autowire(props?: AutowireProp): PropertyDecorator {
  return (target, propertyKey) => {
    attachPropertyDataToClass(
      PLUGIN_AUTOWIRE_KEY,
      {
        autowire: {
          [propertyKey]: props,
        },
      },
      target,
      propertyKey,
      propertyKey as string
    );
  };
}

export function registerPlugins() {
  const modules = listModule(PLUGIN_CLASS_KEY);
  for (const mod of modules) {
    console.log("mod", mod);
    const define: PluginDefine = getClassMetadata(PLUGIN_CLASS_KEY, mod);
    console.log("define", define);
    const inputs = listPropertyDataFromClass(PLUGIN_INPUT_KEY, mod);
    console.log("inputs", inputs);
    for (const input of inputs) {
      define.inputs = {};
      _.merge(define.inputs, input.inputs);
    }

    const outputs = listPropertyDataFromClass(PLUGIN_OUTPUT_KEY, mod);
    console.log("outputs", outputs);
    for (const output of outputs) {
      define.outputs = {};
      _.merge(define.outputs, output.outputs);
    }

    const autowire = listPropertyDataFromClass(PLUGIN_AUTOWIRE_KEY, mod);
    console.log("autowire", autowire);
    for (const auto of autowire) {
      define.autowire = {};
      _.merge(define.autowire, auto.autowire);
    }

    pluginRegistry.register(define.name, {
      define,
      target: mod,
    });
  }
}
