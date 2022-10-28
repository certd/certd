import { AbstractRegistrable } from "../registry";
import { Logger } from "log4js";
import { IAccessService } from "../access/access-service";
import { IContext } from "../core/context";
import { PluginDefine, TaskInput, TaskOutput, TaskPlugin } from "./api";

export abstract class AbstractPlugin extends AbstractRegistrable<PluginDefine> implements TaskPlugin {
  logger!: Logger;
  // @ts-ignore
  accessService: IAccessService;
  // @ts-ignore
  pipelineContext: IContext;
  // @ts-ignore
  userContext: IContext;

  async doInit(options: { accessService: IAccessService; pipelineContext: IContext; userContext: IContext; logger: Logger }) {
    this.accessService = options.accessService;
    this.pipelineContext = options.pipelineContext;
    this.userContext = options.userContext;
    this.logger = options.logger;
    await this.onInit();
  }

  protected async onInit(): Promise<void> {
    //
  }

  abstract execute(input: TaskInput): Promise<TaskOutput>;
}
