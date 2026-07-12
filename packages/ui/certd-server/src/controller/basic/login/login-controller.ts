import { ALL, Body, Controller, Inject, Post, Provide, RequestIP } from "@midwayjs/core";
import { LoginService } from "../../../modules/login/service/login-service.js";
import { AddonService, BaseController, Constants, SysPublicSettings, SysSettingsService } from "@certd/lib-server";
import { CodeService } from "../../../modules/basic/service/code-service.js";
import { checkComm } from "@certd/plus-core";
import { CaptchaService } from "../../../modules/basic/service/captcha-service.js";
import { PasskeyService } from "../../../modules/login/service/passkey-service.js";
import { AuditType } from "../../../modules/sys/enterprise/service/audit-constants.js";

@Provide()
@Controller("/api/")
export class LoginController extends BaseController {
  @Inject()
  loginService: LoginService;
  @Inject()
  codeService: CodeService;

  @Inject()
  sysSettingsService: SysSettingsService;
  @Inject()
  addonService: AddonService;

  @Inject()
  captchaService: CaptchaService;

  @Inject()
  passkeyService: PasskeyService;

  getAuditType(): string {
    return AuditType.login;
  }

  @Post("/login", { description: Constants.per.guest, summary: "用户名密码登录" })
  public async login(
    @Body(ALL)
    body: any,
    @RequestIP()
    remoteIp: string
  ) {
    const settings = await this.sysSettingsService.getPublicSettings();
    if (settings.captchaEnabled === true) {
      await this.captchaService.doValidate({ form: body.captcha, must: false, captchaAddonId: settings.captchaAddonId, req: { remoteIp } });
    }
    try {
      const token = await this.loginService.loginByPassword(body);
      this.writeTokenCookie(token);
      this.auditLog({ userId: token.userId, username: token.username, content: `用户「${body.username}」登录成功` });
      return this.ok(token);
    } catch (err: any) {
      this.auditLog({userId:err.userId,  username: body.username, content: `用户「${body.username}」登录失败：${err.message}` });
      throw err;
    }
  }

  private writeTokenCookie(token: { expire: any; token: any }) {
    // this.loginService.writeTokenCookie(this.ctx,token);
  }

  @Post("/loginBySms", { description: Constants.per.guest, summary: "短信验证码登录" })
  public async loginBySms(
    @Body(ALL)
    body: any
  ) {
    const settings = await this.sysSettingsService.getSetting<SysPublicSettings>(SysPublicSettings);
    if (settings.smsLoginEnabled !== true) {
      throw new Error("当前站点禁止短信验证码登录");
    }
    checkComm();

    try {
      const token = await this.loginService.loginBySmsCode({
        phoneCode: body.phoneCode,
        mobile: body.mobile,
        smsCode: body.smsCode,
        randomStr: body.randomStr,
        inviteCode: body.inviteCode,
      });

      this.writeTokenCookie(token);
      this.auditLog({ userId: token.userId, username: token.username, content: `用户「${body.mobile}」短信登录成功` });
      return this.ok(token);
    } catch (err: any) {
      this.auditLog({userId: err.userId, username: body.mobile, content: `用户「${body.mobile}」短信登录失败：${err.message}` });
      throw err;
    }
  }

  @Post("/loginByTwoFactor", { description: Constants.per.guest, summary: "两步验证登录" })
  public async loginByTwoFactor(
    @Body(ALL)
    body: any
  ) {
    try {
      const token = await this.loginService.loginByTwoFactor({
        loginId: body.loginId,
        verifyCode: body.verifyCode,
      });

      this.writeTokenCookie(token);
      this.auditLog({ userId: token.userId, username: token.username, content: `用户「${body.loginId}」两步验证登录成功` });
      return this.ok(token);
    } catch (err: any) {
      this.auditLog({userId: err.userId, username: body.loginId, content: `用户「${body.loginId}」两步验证登录失败：${err.message}` });
      throw err;
    }
  }

  @Post("/passkey/generateAuthentication", { description: Constants.per.guest })
  public async generateAuthentication() {
    const options = await this.passkeyService.generateAuthenticationOptions(this.ctx);

    return this.ok(options);
  }

  @Post("/loginByPasskey", { description: Constants.per.guest, summary: "Passkey登录" })
  public async loginByPasskey(
    @Body(ALL)
    body: any
  ) {
    try {
      const credential = body.credential;
      const challenge = body.challenge;

      const token = await this.loginService.loginByPasskey(
        {
          credential,
          challenge,
        },
        this.ctx
      );

      this.writeTokenCookie(token);
      this.auditLog({ userId: token.userId, username: token.username, content: "用户Passkey登录成功" });
      return this.ok(token);
    } catch (err: any) {
      this.auditLog({userId: err.userId, username: body.credential, content: `用户Passkey登录失败：${err.message}` });
      throw err;
    }
  }

  @Post("/logout", { description: Constants.per.authOnly })
  public logout() {
    this.ctx.cookies.set("certd_token", "", {
      maxAge: 0,
    });
    return this.ok();
  }
}
