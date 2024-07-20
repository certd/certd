import { Registrable } from "../registry/index.js";
import { FileItem, FormItemProps, Pipeline, Runnable, Step } from "../dt/index.js";
import { FileStore } from "../core/file-store.js";
import { Logger } from "log4js";
import { IAccessService } from "../access/index.js";
import { IEmailService } from "../service/index.js";
import { IContext } from "../core/index.js";
import { AxiosInstance } from "axios";
import { logger } from "../utils/index.js";

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
  group?: string;
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

  randomFileId() {
    return Math.random().toString(36).substring(2, 9);
  }
  linkFile(file: FileItem) {
    this._result.files?.push({
      ...file,
      id: this.randomFileId(),
    });
  }
  saveFile(filename: string, file: Buffer) {
    const filePath = this.ctx.fileStore.writeFile(filename, file);
    logger.info(`saveFile:${filePath}`);
    this._result.files?.push({
      id: this.randomFileId(),
      filename,
      path: filePath,
    });
  }

  extendsFiles() {
    if (this._result.files == null) {
      this._result.files = [];
    }
    this._result.files.push(...(this.ctx.lastStatus?.status?.files || []));
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
