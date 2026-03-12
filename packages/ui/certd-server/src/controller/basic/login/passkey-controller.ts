import { ALL, Body, Controller, Inject, Post, Provide, RequestIP } from "@midwayjs/core";
import { PasskeyService } from "../../../modules/login/service/passkey-service.js";
import { BaseController, Constants } from "@certd/lib-server";
import { UserService } from "../../../modules/sys/authority/service/user-service.js";

@Provide()
@Controller('/api/passkey')
export class PasskeyController extends BaseController {
  @Inject()
  passkeyService: PasskeyService;

  @Inject()
  userService: UserService;

  @Post('/generateRegistration', { summary: Constants.per.authOnly })
  public async generateRegistration(
    @Body(ALL)
    body: any,
    @RequestIP()
    remoteIp: string
  ) {
    const userId = this.getUserId()
    const user = await this.userService.info(userId);
    
    if (!user) {
      throw new Error('用户不存在');
    }

    const options = await this.passkeyService.generateRegistrationOptions(
      userId,
      user.username,
      remoteIp,
      this.ctx
    );

    return this.ok({
      ...options,
      userId
    });
  }

  @Post('/verifyRegistration', { summary: Constants.per.guest })
  public async verifyRegistration(
    @Body(ALL)
    body: any
  ) {
    const userId = body.userId;
    const response = body.response;
    const challenge = body.challenge;
    const deviceName = body.deviceName;

    const result = await this.passkeyService.registerPasskey(
      userId,
      response,
      challenge,
      deviceName,
      this.ctx
    );

    return this.ok(result);
  }

  @Post('/generateAuthentication', { summary: Constants.per.guest })
  public async generateAuthentication(
    @Body(ALL)
    body: any
  ) {
    const options = await this.passkeyService.generateAuthenticationOptions(
      this.ctx
    );

    return this.ok({
      ...options,
    });
  }



  @Post('/register', { summary: Constants.per.guest })
  public async registerPasskey(
    @Body(ALL)
    body: any
  ) {
    const userId = body.userId;
    const response = body.response;
    const deviceName = body.deviceName;
    const challenge = body.challenge;

    const result = await this.passkeyService.registerPasskey(
      userId,
      response,
      challenge,
      deviceName,
      this.ctx
    );

    return this.ok(result);
  }
}
