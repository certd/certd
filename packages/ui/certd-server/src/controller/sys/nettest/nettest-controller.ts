import { BaseController } from "@certd/lib-server";
import { ALL, Body, Controller, Inject, Post, Provide } from "@midwayjs/core";
import { NetTestService } from "../../../modules/sys/nettest/nettest-service.js";

@Provide()
@Controller("/api/sys/nettest/")
export class SysNetTestController extends BaseController {
  @Inject()
  netTestService: NetTestService;

  @Post("/domainResolve", { description: "sys:settings:view" })
  public async domainResolve(@Body(ALL) body: { domain: string }) {
    const { domain } = body;
    const result = await this.netTestService.domainResolve(domain);
    return this.ok(result);
  }

  // ping
  @Post("/ping", { description: "sys:settings:view" })
  public async ping(@Body(ALL) body: { domain: string }) {
    const { domain } = body;
    const result = await this.netTestService.ping(domain);
    return this.ok(result);
  }

  // telnet
  @Post("/telnet", { description: "sys:settings:view" })
  public async telnet(@Body(ALL) body: { domain: string; port: number }) {
    const { domain, port } = body;
    const result = await this.netTestService.telnet(domain, port);
    return this.ok(result);
  }

  // telnet
  @Post("/serverInfo", { description: "sys:settings:view" })
  public async serverInfo() {
    const result = await this.netTestService.serverInfo();
    return this.ok(result);
  }
}
