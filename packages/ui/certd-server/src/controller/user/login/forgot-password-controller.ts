import { ALL, Body, Controller, Inject, Post, Provide } from '@midwayjs/core';
import { BaseController, CommonException, Constants, SysSettingsService } from "@certd/lib-server";
import { CodeService } from '../../../modules/basic/service/code-service.js';
import { UserService } from '../../../modules/sys/authority/service/user-service.js';

/**
 */
@Provide()
@Controller('/api')
export class LoginController extends BaseController {
  @Inject()
  userService: UserService;
  @Inject()
  codeService: CodeService;

  @Inject()
  sysSettingsService: SysSettingsService;

  @Post('/forgotPassword', { summary: Constants.per.guest })
  public async forgotPassword(
    @Body(ALL)
    body: any,
  ) {
    if(body.type === 'email') {
      this.codeService.checkEmailCode({
        email: body.input,
        randomStr: body.randomStr,
        validateCode: body.validateCode,
        throwError: true,
      });
    } else if(body.type === 'mobile') {
      await this.codeService.checkSmsCode({
        mobile: body.input,
        randomStr: body.randomStr,
        phoneCode: body.phoneCode,
        smsCode: body.validateCode,
        throwError: true,
      });
    } else {
      throw new CommonException('暂不支持的找回类型,请联系管理员找回');
    }
    await this.userService.forgotPassword(body);
    return this.ok();
  }
}
