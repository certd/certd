import { Config, Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { UserService } from "../../sys/authority/service/user-service.js";
import jwt from "jsonwebtoken";
import {
  AuthException,
  CommonException,
  Need2FAException,
  SysPrivateSettings,
  SysSettingsService
} from "@certd/lib-server";
import { RoleService } from "../../sys/authority/service/role-service.js";
import { UserEntity } from "../../sys/authority/entity/user.js";
import { cache, utils } from "@certd/basic";
import { LoginErrorException } from "@certd/lib-server";
import { CodeService } from "../../basic/service/code-service.js";
import { TwoFactorService } from "../../mine/service/two-factor-service.js";
import { UserSettingsService } from "../../mine/service/user-settings-service.js";
import { isPlus } from "@certd/plus-core";
import { AddonService } from "@certd/lib-server";
import { OauthBoundService } from "./oauth-bound-service.js";
import { PasskeyService } from "./passkey-service.js";

/**
 */
@Provide()
@Scope(ScopeEnum.Request, {allowDowngrade: true})
export class LoginService {
  @Inject()
  userService: UserService;
  @Inject()
  roleService: RoleService;

  @Inject()
  codeService: CodeService;
  @Config('auth.jwt')
  private jwt: any;

  @Inject()
  sysSettingsService: SysSettingsService;
  @Inject()
  userSettingsService: UserSettingsService;
  @Inject()
  twoFactorService: TwoFactorService;
  @Inject()
  addonService: AddonService;
  @Inject()
  oauthBoundService: OauthBoundService;

  @Inject()
  passkeyService: PasskeyService;

  checkIsBlocked(username: string) {
    const blockDurationKey = `login_block_duration:${username}`;
    const value = cache.get(blockDurationKey);
    if (value) {
      const ttl = cache.getRemainingTTL(blockDurationKey)
      const leftMin = Math.ceil(ttl / 1000 / 60);
      throw new CommonException(`账号被锁定，请${leftMin}分钟后重试`);
    }
  }

  clearCacheOnSuccess(username: string) {
    cache.delete(`login_error_times:${username}`);
    cache.delete(`login_block_times:${username}`);
    cache.delete(`login_block_duration:${username}`);
  }

  addErrorTimes(username: string, errorMessage: string) {
    const errorTimesKey = `login_error_times:${username}`;
    const blockTimesKey = `login_block_times:${username}`;
    const blockDurationKey = `login_block_duration:${username}`;
    let blockTimes = cache.get(blockTimesKey);
    // let maxWaitMin = 2;
    const maxRetryTimes = blockTimes > 1 ? 3 : 5;
    if (blockTimes == null) {
      blockTimes = 0;
    }
    // maxWaitMin = maxWaitMin * blockTimes;
    // let ttl = maxWaitMin * 60 * 1000;

    let errorTimes = cache.get(errorTimesKey);

    if (errorTimes == null) {
      errorTimes = 0;
    }
    errorTimes += 1;
    const ttl24H = 24 * 60 * 60 * 1000;
    cache.set(errorTimesKey, errorTimes, {
      ttl: ttl24H,
    });
    if (errorTimes > maxRetryTimes) {
      blockTimes += 1;
      cache.set(blockTimesKey, blockTimes, {
        ttl: ttl24H,
      });
      //按照block次数指数递增，最长24小时
      const ttl = Math.min(blockTimes * blockTimes * 60 * 1000, ttl24H);
      const leftMin = Math.ceil(ttl / 1000 / 60);
      cache.set(blockDurationKey, 1, {
        ttl: ttl,
      })
      // 清除error次数
      cache.delete(errorTimesKey);
      throw new LoginErrorException(`登录失败次数过多，请${leftMin}分钟后重试`, 0);
    }
    const leftTimes = maxRetryTimes - errorTimes;
    if (leftTimes < 3) {
      throw new LoginErrorException(`登录失败(${errorMessage})，剩余尝试次数：${leftTimes}`, leftTimes);
    }
    throw new LoginErrorException(errorMessage, leftTimes);
  }


  async loginBySmsCode(req: { mobile: string; phoneCode: string; smsCode: string; randomStr: string }) {

    this.checkIsBlocked(req.mobile)

    const smsChecked = await this.codeService.checkSmsCode({
      mobile: req.mobile,
      phoneCode: req.phoneCode,
      smsCode: req.smsCode,
      throwError: false,
    });

    const {mobile, phoneCode} = req;
    if (!smsChecked) {
      this.addErrorTimes(mobile, '手机验证码错误');
    }
    let info = await this.userService.findOne({phoneCode, mobile: mobile});
    if (info == null) {
      //用户不存在，注册
      info = await this.userService.register('mobile', {
        phoneCode,
        mobile,
        password: '',
      } as any);
    }
    this.clearCacheOnSuccess(mobile);
    return this.onLoginSuccess(info);
  }

  async loginByPassword(req: { username: string; password: string; phoneCode: string }) {
    this.checkIsBlocked(req.username)
    const {username, password, phoneCode} = req;
    const info = await this.userService.findOne([{username: username}, {email: username}, {
      phoneCode,
      mobile: username
    }]);
    if (info == null) {
      throw new CommonException('用户名或密码错误');
    }
    const right = await this.userService.checkPassword(password, info.password, info.passwordVersion);
    if (!right) {
      this.addErrorTimes(username, '用户名或密码错误');
    }
    this.clearCacheOnSuccess(username);
    return this.onLoginSuccess(info);
  }

  async checkTwoFactorEnabled(userId: number) {
    //检查是否开启多重认证
    if (!isPlus()) {
      return true
    }

    const twoFactorSetting = await this.twoFactorService.getSetting(userId)

    const authenticatorSetting = twoFactorSetting.authenticator
    if (authenticatorSetting.enabled) {
      //要检查
      const randomKey = utils.id.simpleNanoId(12)
      cache.set(`login_2fa_code:${randomKey}`, userId, {
        ttl: 60 * 1000 * 2,
      })
      throw new Need2FAException('已开启多重认证，请在2分钟内输入OPT验证码',randomKey)
    }

  }

  async loginByTwoFactor(req: { loginId: string; verifyCode: string }) {
    //检查是否开启多重认证
    if (!isPlus()) {
      throw new Error('本功能需要开通Certd专业版')
    }
    const userId = cache.get(`login_2fa_code:${req.loginId}`)
    if (!userId) {
      throw new AuthException('已超时，请返回重新登录')
    }
    await this.twoFactorService.verifyAuthenticatorCode(userId, req.verifyCode)

    const user = await this.userService.info(userId);
    if (!user) {
      throw new AuthException('用户不存在')
    }
    return this.generateToken(user)
  }

  private async onLoginSuccess(info: UserEntity) {
    if (info.status === 0) {
      throw new CommonException('用户已被禁用');
    }
    await this.checkTwoFactorEnabled(info.id)
    return this.generateToken(info);
  }

  writeTokenCookie(ctx:any,token: { expire: any; token: any }) {
    ctx.cookies.set("certd_token", token.token, {
      maxAge: 1000 * token.expire
    });
  }


  /**
   * 生成token
   * @param user 用户对象
   * @param roleIds
   */
  async generateToken(user: UserEntity) {
    if (user.status === 0) {
      throw new CommonException('用户已被禁用');
    }

    const roleIds = await this.roleService.getRoleIdsByUserId(user.id);
    const tokenInfo = {
      username: user.username,
      id: user.id,
      roles: roleIds,
    };
    const expire = this.jwt.expire;

    const setting = await this.sysSettingsService.getSetting<SysPrivateSettings>(SysPrivateSettings);
    const jwtSecret = setting.jwtKey;

    const token = jwt.sign(tokenInfo, jwtSecret, {
      expiresIn: expire,
    });

    return {
      token,
      expire,
    };
  }


  async loginByOpenId(req: { openId: string, type:string }) {
    const {openId, type} = req;
    const oauthBound = await this.oauthBoundService.findOne({
      where:{openId, type: type.replace(':', '')}
    });
    if (oauthBound == null) {
      return null
    }
    const info = await this.userService.findOne({id: oauthBound.userId});
    if (info == null) {
      // 用户已被删除，删除此oauth绑定
      await this.oauthBoundService.delete([oauthBound.id]);
      return null
    }
    return this.generateToken(info);
  }

  async loginByPasskey(req: { credential: any; challenge: string }, ctx: any) {
    const {credential, challenge} = req;
    const user = await this.passkeyService.loginByPasskey(credential, challenge, ctx);
    return this.generateToken(user);
  }}

