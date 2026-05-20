import { BaseController, Constants, SysSettingsService } from "@certd/lib-server";
import { ALL, Body, Controller, Inject, Post, Provide } from "@midwayjs/core";
import { PasskeyService } from "../../../modules/login/service/passkey-service.js";
import { RoleService } from "../../../modules/sys/authority/service/role-service.js";
import { UserService } from "../../../modules/sys/authority/service/user-service.js";
import { ApiTags } from "@midwayjs/swagger";
import { CodeService } from "../../../modules/basic/service/code-service.js";

/**
 */
@Provide()
@Controller("/api/mine")
@ApiTags(["mine"])
export class MineController extends BaseController {
  @Inject()
  userService: UserService;

  @Inject()
  roleService: RoleService;

  @Inject()
  passkeyService: PasskeyService;

  @Inject()
  codeService: CodeService;

  @Inject()
  sysSettingsService: SysSettingsService;

  @Post("/info", { description: Constants.per.authOnly, summary: "查询用户信息" })
  public async info() {
    const userId = this.getUserId();
    const user = await this.userService.info(userId);
    const isWeak = await this.userService.checkPassword("123456", user.password, user.passwordVersion);
    if (isWeak) {
      //@ts-ignore
      user.isWeak = true;
    }
    const needInitPassword = user.password === "changeme";
    user.roleIds = await this.roleService.getRoleIdsByUserId(userId);
    delete user.password;
    //@ts-ignore
    user.needInitPassword = needInitPassword;
    return this.ok(user);
  }

  @Post("/changePassword", { description: Constants.per.authOnly, summary: "修改密码" })
  public async changePassword(@Body(ALL) body: any) {
    const userId = this.getUserId();
    await this.userService.changePassword(userId, body);
    return this.ok({});
  }

  @Post("/initPassword", { description: Constants.per.authOnly, summary: "初始化密码" })
  public async initPassword(@Body(ALL) body: any) {
    const userId = this.getUserId();
    await this.userService.initPassword(userId, body);
    return this.ok({});
  }

  @Post("/updateProfile", { description: Constants.per.authOnly, summary: "更新用户资料" })
  public async updateProfile(@Body(ALL) body: any) {
    const userId = this.getUserId();

    await this.userService.updateProfile(userId, {
      avatar: body.avatar,
      nickName: body.nickName,
    });
    return this.ok({});
  }

  @Post("/contact/capability", { description: Constants.per.authOnly, summary: "查询联系方式绑定能力" })
  public async contactCapability() {
    const settings = await this.sysSettingsService.getPrivateSettings();
    return this.ok({
      smsEnabled: !!settings.sms?.config?.accessId,
    });
  }

  @Post("/contact/verifyIdentity", { description: Constants.per.authOnly, summary: "验证本人操作" })
  public async verifyContactIdentity(@Body(ALL) body: { identityType: "password" | "email" | "mobile"; identityPassword?: string; identityValidateCode?: string }) {
    const userId = this.getUserId();
    await this.userService.verifyIdentity(userId, body, this.codeService);
    const validationCode = this.codeService.setValidationValue({
      type: "contactIdentity",
      userId,
      identityType: body.identityType,
    });
    return this.ok({ validationCode });
  }

  @Post("/contact/mobile", { description: Constants.per.authOnly, summary: "绑定或修改手机号" })
  public async updateMobile(@Body(ALL) body: { phoneCode?: string; mobile: string; validateCode: string; identityValidationCode: string }) {
    const userId = this.getUserId();
    this.userService.checkContactIdentityValidation(userId, body.identityValidationCode, this.codeService);
    await this.codeService.checkSmsCode({
      mobile: body.mobile,
      phoneCode: body.phoneCode || "86",
      smsCode: body.validateCode,
      verificationType: "bindMobile",
      throwError: true,
    });
    await this.userService.updateMobile(userId, {
      phoneCode: body.phoneCode,
      mobile: body.mobile,
    });
    return this.ok({});
  }

  @Post("/contact/email", { description: Constants.per.authOnly, summary: "绑定或修改邮箱" })
  public async updateEmail(@Body(ALL) body: { email: string; validateCode: string; identityValidationCode: string }) {
    const userId = this.getUserId();
    this.userService.checkContactIdentityValidation(userId, body.identityValidationCode, this.codeService);
    this.codeService.checkEmailCode({
      email: body.email,
      validateCode: body.validateCode,
      verificationType: "bindEmail",
      throwError: true,
    });
    await this.userService.updateEmail(userId, {
      email: body.email,
    });
    return this.ok({});
  }
}
