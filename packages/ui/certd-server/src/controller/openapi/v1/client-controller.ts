import { ALL, Body, Controller, Inject, Post, Provide } from "@midwayjs/core";
import { CodeException, Constants } from "@certd/lib-server";
import { isPlus } from "@certd/plus-core";
import { ApiTags } from "@midwayjs/swagger";
import { OpenKey } from "../../../modules/open/service/open-key-service.js";
import { BaseOpenController } from "../base-open-controller.js";
import { ClientHeartbeatReq, ClientService } from "../../../modules/client/service/client-service.js";

/**
 * certd-client 客户端上报接口。
 */
@Provide()
@Controller("/api/v1/client")
@ApiTags(["openapi"])
export class OpenClientController extends BaseOpenController {
  @Inject()
  clientService: ClientService;

  @Post("/heartbeat", { description: Constants.per.open, summary: "客户端心跳上报" })
  async heartbeat(@Body(ALL) bean: ClientHeartbeatReq) {
    const openKey: OpenKey = this.ctx.openKey;
    const userId = openKey.userId;
    if (userId == null) {
      throw new CodeException(Constants.res.openKeyError);
    }
    // 客户端上报仅专业版可用；非专业版直接忽略，不保存也不报错。
    if (!isPlus()) {
      return this.ok({ success: true });
    }
    await this.clientService.heartbeat(userId, openKey.projectId, openKey.keyId, bean);
    return this.ok({ success: true });
  }
}
