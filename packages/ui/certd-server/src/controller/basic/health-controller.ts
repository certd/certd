import { Controller, Get, Provide } from "@midwayjs/core";
import { BaseController, Constants } from "@certd/lib-server";

/**
 */
@Provide()
@Controller("/health")
export class HealthController extends BaseController {
  @Get("/liveliness", { description: Constants.per.guest })
  async liveliness(): Promise<any> {
    return this.ok("ok");
  }

  @Get("/readiness", { description: Constants.per.guest })
  async readiness(): Promise<any> {
    return this.ok("ok");
  }
}
