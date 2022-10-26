import { FormItemProps } from "@fast-crud/fast-crud";
import { Registrable } from "../registry";
import { pluginRegistry } from "./registry";
export type TaskInput = {
  [key: string]: any;
};

export type TaskOutput = {
  [key: string]: any;
};

export enum ContextScope {
  global,
  pipeline,
  runtime,
}

export type Storage = {
  scope: ContextScope;
  path: string;
};

export type TaskOutputDefine = {
  title: string;
  key: string;
  value?: any;
  storage?: Storage;
};
export type TaskInputDefine = FormItemProps;

export type PluginDefine = Registrable & {
  input: {
    [key: string]: TaskInputDefine;
  };
  output: {
    [key: string]: TaskOutputDefine;
  };
};

export interface TaskPlugin {
  execute(input: TaskInput): Promise<TaskOutput>;
}

export type OutputVO = {
  key: string;
  title: string;
  value: any;
};

export function IsTask(define: (() => PluginDefine) | PluginDefine) {
  return function (target: any) {
    if (define instanceof Function) {
      target.define = define();
    } else {
      target.define = define;
    }

    pluginRegistry.install(target);
  };
}
