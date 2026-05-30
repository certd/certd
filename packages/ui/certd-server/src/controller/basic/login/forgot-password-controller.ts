import { ALL, Body, Controller, Inject, Post, Provide } from "@midwayjs/core";
import { BaseController, CommonException, Constants, SysSettingsService } from "@certd/lib-server";
import { CodeService } from "../../../modules/basic/service/code-service.js";
import { UserService } from "../../../modules/sys/authority/service/user-service.js";
import { LoginService } from "../../../modules/login/service/login-service.js";

/**
 */
@Provide()
@Controller("/api")
export class ForgotPasswordController extends BaseController {
  @Inject()
  loginService: LoginService;
  @Inject()
  userService: UserService;
  @Inject()
  codeService: CodeService;

  @Inject()
  sysSettingsService: SysSettingsService;

  @Post("/forgotPassword", { description: Constants.per.guest })
  public async forgotPassword(
    @Body(ALL)
    body: any
  ) {
    const sysSettings = await this.sysSettingsService.getPublicSettings();
    if (!sysSettings.selfServicePasswordRetrievalEnabled) {
      throw new CommonException("暂未开启自助找回");
    }
    // 找回密码的验证码允许错误次数
    const maxErrorCount = 5;

    if (body.type === "email") {
      this.codeService.checkEmailCode({
        verificationType: "forgotPassword",
        email: body.input,
        validateCode: body.validateCode,
        maxErrorCount: maxErrorCount,
        throwError: true,
      });
    } else if (body.type === "mobile") {
      await this.codeService.checkSmsCode({
        verificationType: "forgotPassword",
        mobile: body.input,
        phoneCode: body.phoneCode,
        smsCode: body.validateCode,
        maxErrorCount: maxErrorCount,
        throwError: true,
      });
    } else {
      throw new CommonException("暂不支持的找回类型,请联系管理员找回");
    }
    const username = await this.userService.forgotPassword(body);
    username && this.loginService.clearCacheOnSuccess(username);
    return this.ok();
  }
}
