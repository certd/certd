import { ALL, Body, Controller, Inject, Post, Provide, RequestIP } from "@midwayjs/core";
import { PasskeyService } from "../../../modules/login/service/passkey-service.js";
import { BaseController, Constants } from "@certd/lib-server";
import { UserService } from "../../../modules/sys/authority/service/user-service.js";
import { ApiTags } from "@midwayjs/swagger";

@Provide()
@Controller("/api/mine/passkey")
@ApiTags(["mine"])
export class MinePasskeyController extends BaseController {
  @Inject()
  passkeyService: PasskeyService;

  @Inject()
  userService: UserService;

  @Post("/generateRegistration", { description: Constants.per.authOnly, summary: "生成Passkey注册选项" })
  public async generateRegistration(
    @Body(ALL)
    body: any,
    @RequestIP()
    remoteIp: string
  ) {
    const userId = this.getUserId();
    const user = await this.userService.info(userId);

    if (!user) {
      throw new Error("用户不存在");
    }

    const options = await this.passkeyService.generateRegistrationOptions(userId, user.username, remoteIp, this.ctx);

    return this.ok({
      ...options,
    });
  }

  @Post("/verifyRegistration", { description: Constants.per.authOnly, summary: "验证Passkey注册" })
  public async verifyRegistration(
    @Body(ALL)
    body: any
  ) {
    const userId = this.getUserId();
    const response = body.response;
    const challenge = body.challenge;
    const deviceName = body.deviceName;

    const result = await this.passkeyService.registerPasskey(userId, response, challenge, deviceName, this.ctx);

    return this.ok(result);
  }

  @Post("/register", { description: Constants.per.authOnly, summary: "注册Passkey" })
  public async registerPasskey(
    @Body(ALL)
    body: any
  ) {
    const userId = this.getUserId();
    const response = body.response;
    const deviceName = body.deviceName;
    const challenge = body.challenge;

    const result = await this.passkeyService.registerPasskey(userId, response, challenge, deviceName, this.ctx);

    return this.ok(result);
  }

  @Post("/list", { description: Constants.per.authOnly, summary: "查询Passkey列表" })
  public async getPasskeys() {
    const userId = this.getUserId();
    const passkeys = await this.passkeyService.find({
      select: ["id", "deviceName", "registeredAt", "transports", "passkeyId", "updateTime"],
      where: { userId },
      order: { registeredAt: "DESC" },
    });
    return this.ok(passkeys);
  }

  @Post("/unbind", { description: Constants.per.authOnly, summary: "解绑Passkey" })
  public async unbindPasskey(@Body(ALL) body: any) {
    const userId = this.getUserId();
    const passkeyId = body.id;

    const passkey = await this.passkeyService.findOne({
      where: { id: passkeyId, userId },
    });

    if (!passkey) {
      throw new Error("Passkey不存在");
    }

    await this.passkeyService.delete([passkey.id]);
    return this.ok({});
  }
}
