import { Registrable } from "../registry";
import { FormItemProps } from "../d.ts";

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
  value?: any;
  storage?: Storage;
};
export type TaskInputDefine = FormItemProps;

export type PluginDefine = Registrable & {
  default?: any;
  input?: {
    [key: string]: TaskInputDefine;
  };
  output?: {
    [key: string]: TaskOutputDefine;
  };

  autowire?: {
    [key: string]: any;
  };
};

export interface ITaskPlugin {
  onInit(): Promise<void>;
  execute(): Promise<void>;
}

export type OutputVO = {
  key: string;
  title: string;
  value: any;
};
