import { AbstractRegistrable } from "../registry";
import { Logger } from "log4js";
import { logger } from "../utils/util.log";
import { IAccessService } from "../access/access-service";
import { IContext } from "../core/context";
import { PluginDefine, TaskInput, TaskOutput, TaskPlugin } from "./api";

export abstract class AbstractPlugin extends AbstractRegistrable<PluginDefine> implements TaskPlugin {
  logger: Logger = logger;
  // @ts-ignore
  accessService: IAccessService;
  // @ts-ignore
  pipelineContext: IContext;
  // @ts-ignore
  userContext: IContext;

  async doInit(options: { accessService: IAccessService; pipelineContext: IContext; userContext: IContext }) {
    this.accessService = options.accessService;
    this.pipelineContext = options.pipelineContext;
    this.userContext = options.userContext;
    await this.onInit();
  }

  protected async onInit(): Promise<void> {
    //
  }

  abstract execute(input: TaskInput): Promise<TaskOutput>;
}
