import { ALL, Body, Controller, Inject, Post, Provide, RequestIP } from "@midwayjs/core";
import { BaseController, Constants, SysSettingsService } from "@certd/lib-server";
import { RegisterType } from "../../../modules/sys/authority/service/user-service.js";
import { CodeService } from "../../../modules/basic/service/code-service.js";
import { checkComm, checkPlus } from "@certd/plus-core";
import { LoginService } from "../../../modules/login/service/login-service.js";
import { AuditType } from "../../../modules/sys/enterprise/service/audit-constants.js";
import { RegisterInviteService, resolveRegisterMode } from "../../../modules/login/service/register-invite-service.js";

export type RegisterReq = {
  type: RegisterType;
  username: string;
  password: string;
  mobile: string;
  email: string;
  phoneCode?: string;

  validateCode: string;
  captcha: any;
  inviteCode?: string;
  inviteToken?: string;
};

/**
 */
@Provide()
@Controller("/api/")
export class RegisterController extends BaseController {
  @Inject()
  loginService: LoginService;
  @Inject()
  codeService: CodeService;

  @Inject()
  sysSettingsService: SysSettingsService;

  @Inject()
  registerInviteService: RegisterInviteService;

  getAuditType(): string {
    return AuditType.login.value;
  }

  private publicMethods(pub: any) {
    return {
      username: pub.usernameRegisterEnabled !== false,
      email: pub.emailRegisterEnabled === true,
      mobile: pub.mobileRegisterEnabled === true,
    };
  }

  /**
   * 注册页可用性：关闭 / 受邀 token 无效 / 已过期 / 已使用，全部统一返回 closed，
   * 不暴露 token 具体状态，避免形成枚举 oracle。
   */
  @Post("/register/status", { description: Constants.per.guest, summary: "注册可用性" })
  public async registerStatus(@Body("inviteToken") inviteToken: string, @RequestIP() remoteIp: string) {
    const pub = await this.sysSettingsService.getPublicSettings();
    const mode = resolveRegisterMode(pub);
    this.registerInviteService.assertRateLimit(remoteIp, "status");
    // 打开注册页时惰性清理“已过期/已禁用且未使用”的邀请链接（服务内 60s 节流）
    await this.registerInviteService.cleanupInvalid().catch(() => undefined);
    if (mode === "open") {
      return this.ok({ mode: "open", canRegister: true, methods: this.publicMethods(pub) });
    }
    if (mode === "invite") {
      const usable = await this.registerInviteService.findUsableByToken(inviteToken);
      if (usable) {
        return this.ok({ mode: "invite", canRegister: true, methods: this.publicMethods(pub) });
      }
    }
    return this.ok({ mode: "closed", canRegister: false, methods: { username: false, email: false, mobile: false } });
  }

  @Post("/register", { description: Constants.per.guest, summary: "用户注册" })
  public async register(
    @Body(ALL)
    body: RegisterReq,
    @RequestIP() remoteIp: string
  ) {
    const pub = await this.sysSettingsService.getPublicSettings();
    const mode = resolveRegisterMode(pub);
    // 限流对所有注册尝试生效（含错误 token），防止暴力枚举
    this.registerInviteService.assertRateLimit(remoteIp, "register");
    if (mode === "closed") {
      throw new Error("未开放注册");
    }
    let inviteToken = "";
    if (mode === "invite") {
      inviteToken = String(body.inviteToken || "").trim();
      const usable = await this.registerInviteService.findUsableByToken(inviteToken);
      if (!usable) {
        // 与“关闭注册”表现一致，避免区分错误 token / 过期 / 已使用
        throw new Error("未开放注册");
      }
    }

    if (body.username && ["admin", "certd"].includes(body.username)) {
      throw new Error("用户名不能为保留字");
    }

    const doRegister = async (registerUser: any) => {
      // 受邀模式下在“创建用户”同一事务内原子消费 token：并发只能成功一次，失败则整体回滚
      const withTx =
        mode === "invite"
          ? async (tx: any) => {
              const usedUserName = registerUser.username || registerUser.mobile || registerUser.email || "";
              const ok = await this.registerInviteService.consume({
                token: inviteToken,
                usedUserId: registerUser.id,
                usedUserName,
                manager: tx,
              });
              if (!ok) {
                throw new Error("未开放注册");
              }
            }
          : undefined;
      return await this.loginService.register(body.type, registerUser, body.inviteCode, withTx);
    };

    if (body.type === "username") {
      if (pub.usernameRegisterEnabled === false) {
        throw new Error("当前站点已禁止用户名注册功能");
      }
      if (!body.username) {
        throw new Error("用户名不能为空");
      }

      await this.codeService.checkCaptcha(body.captcha, { remoteIp });
      const registerUser = {
        username: body.username,
        password: body.password,
      } as any;
      const newUser = await doRegister(registerUser);
      this.auditLog({ userId: newUser.id, username: body.username, content: `用户「${body.username}」注册成功` });
      return this.ok(newUser);
    } else if (body.type === "mobile") {
      if (pub.mobileRegisterEnabled === false) {
        throw new Error("当前站点已禁止手机号注册功能");
      }
      checkComm();
      //验证短信验证码
      await this.codeService.checkSmsCode({
        mobile: body.mobile,
        phoneCode: body.phoneCode,
        smsCode: body.validateCode,
        throwError: true,
      });
      const registerUser = {
        username: body.username,
        phoneCode: body.phoneCode,
        mobile: body.mobile,
        password: body.password,
      } as any;
      const newUser = await doRegister(registerUser);
      this.auditLog({ userId: newUser.id, username: body.mobile, content: `用户「${body.mobile}」注册成功` });
      return this.ok(newUser);
    } else if (body.type === "email") {
      if (pub.emailRegisterEnabled === false) {
        throw new Error("当前站点已禁止Email注册功能");
      }
      checkPlus();
      this.codeService.checkEmailCode({
        email: body.email,
        validateCode: body.validateCode,
        throwError: true,
      });
      const registerUser = {
        username: body.username,
        email: body.email,
        password: body.password,
      } as any;
      const newUser = await doRegister(registerUser);
      this.auditLog({ userId: newUser.id, username: body.email, content: `用户「${body.email}」注册成功` });
      return this.ok(newUser);
    }
  }
}
