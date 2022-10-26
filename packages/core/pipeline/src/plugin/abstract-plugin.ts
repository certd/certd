import { AbstractRegistrable } from "../registry";
import { PluginDefine } from "./api";
import { Logger } from "log4js";
import { logger } from "../utils/util.log";
import { IAccessService } from "../access/access-service";
import { IContext } from "../core/context";

export abstract class AbstractPlugin extends AbstractRegistrable {
  static define: PluginDefine;
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
}
