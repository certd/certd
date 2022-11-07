import { AbstractRegistrable } from "../registry";
import { Logger } from "log4js";
import { IContext } from "../core/context";
import { PluginDefine, TaskInput, TaskOutput, TaskPlugin } from "./api";
import { IAccessService } from "../access";
import { AxiosInstance } from "axios";

export abstract class AbstractPlugin extends AbstractRegistrable<PluginDefine> implements TaskPlugin {
  logger!: Logger;
  // @ts-ignore
  accessService: IAccessService;
  // @ts-ignore
  pipelineContext: IContext;
  // @ts-ignore
  userContext: IContext;
  http!: AxiosInstance;

  async doInit(options: { accessService: IAccessService; pipelineContext: IContext; userContext: IContext; logger: Logger; http: AxiosInstance }) {
    this.accessService = options.accessService;
    this.pipelineContext = options.pipelineContext;
    this.userContext = options.userContext;
    this.logger = options.logger;
    this.http = options.http;
    await this.onInit();
  }

  protected async onInit(): Promise<void> {
    //
  }

  abstract execute(input: TaskInput): Promise<TaskOutput>;
}
