import { Registrable } from "../registry";
import { FileItem, FormItemProps, Pipeline, Runnable, Step } from "../d.ts";
import { FileStore } from "../core/file-store";
import { Logger } from "log4js";
import { IAccessService } from "../access";
import { IEmailService } from "../service";
import { IContext } from "../core";
import { AxiosInstance } from "axios";

//解决 uuid random-values not support 问题
// https://github.com/uuidjs/uuid#getrandomvalues-not-supported
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
export enum ContextScope {
  global,
  pipeline,
  runtime,
}

export type TaskOutputDefine = {
  title: string;
  value?: any;
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

  reference?: {
    src: string;
    dest: string;
    type: "computed";
  }[];
};

export type ITaskPlugin = {
  onInstance(): Promise<void>;
  execute(): Promise<void>;
  [key: string]: any;
};

export type TaskResult = {
  clearLastStatus?: boolean;
  files?: FileItem[];
};
export type TaskInstanceContext = {
  pipeline: Pipeline;
  step: Step;
  logger: Logger;
  accessService: IAccessService;
  emailService: IEmailService;
  pipelineContext: IContext;
  userContext: IContext;
  http: AxiosInstance;
  fileStore: FileStore;
  lastStatus?: Runnable;
};

export abstract class AbstractTaskPlugin implements ITaskPlugin {
  _result: TaskResult = { clearLastStatus: false, files: [] };
  ctx!: TaskInstanceContext;
  clearLastStatus() {
    this._result.clearLastStatus = true;
  }

  getFiles() {
    return this._result.files;
  }

  setCtx(ctx: TaskInstanceContext) {
    this.ctx = ctx;
  }

  linkFile(file: FileItem) {
    this._result.files!.push({
      ...file,
      id: uuidv4(),
    });
  }
  saveFile(filename: string, file: Buffer) {
    const filePath = this.ctx.fileStore.writeFile(filename, file);
    this._result.files!.push({
      id: uuidv4(),
      filename,
      path: filePath,
    });
  }

  get pipeline() {
    return this.ctx.pipeline;
  }

  get step() {
    return this.ctx.step;
  }

  async onInstance(): Promise<void> {
    return;
  }

  abstract execute(): Promise<void>;
}

export type OutputVO = {
  key: string;
  title: string;
  value: any;
};
