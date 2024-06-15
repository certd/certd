import {
  ALL,
  Body,
  Controller,
  Inject,
  Post,
  Provide,
} from '@midwayjs/decorator';
import { BaseController } from '../../../basic/base-controller';
import { Constants } from '../../../basic/constants';
import { UserService } from '../../authority/service/user-service';
import { UserEntity } from '../../authority/entity/user';
import { SysSettingsService } from '../../system/service/sys-settings-service';

/**
 */
@Provide()
@Controller('/api/')
export class RegisterController extends BaseController {
  @Inject()
  userService: UserService;

  @Inject()
  sysSettingsService: SysSettingsService;

  @Post('/register', { summary: Constants.per.guest })
  public async register(
    @Body(ALL)
    user: UserEntity
  ) {
    const sysPublicSettings = await this.sysSettingsService.getPublicSettings();
    if (sysPublicSettings.registerEnabled === false) {
      throw new Error('当前站点已禁止自助注册功能');
    }
    const newUser = await this.userService.register(user);
    return this.ok(newUser);
  }
}
