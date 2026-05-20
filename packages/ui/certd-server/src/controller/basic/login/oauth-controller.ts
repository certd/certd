import { logger, simpleNanoId, utils } from "@certd/basic";
import { addonRegistry, AddonService, BaseController, Constants, SysInstallInfo, SysSettingsService } from "@certd/lib-server";
import { checkPlus } from "@certd/plus-core";
import { ALL, Body, Controller, Get, Inject, Param, Post, Provide, Query } from "@midwayjs/core";
import { CodeService } from "../../../modules/basic/service/code-service.js";
import { OauthBoundEntity } from "../../../modules/login/entity/oauth-bound.js";
import { LoginService } from "../../../modules/login/service/login-service.js";
import { OauthBoundService } from "../../../modules/login/service/oauth-bound-service.js";
import { AddonGetterService } from "../../../modules/pipeline/service/addon-getter-service.js";
import { UserEntity } from "../../../modules/sys/authority/entity/user.js";
import { UserService } from "../../../modules/sys/authority/service/user-service.js";
import { IOauthProvider } from "../../../plugins/plugin-oauth/api.js";

type OauthProviderSetting = {
  type: string;
  title: string;
  icon?: string;
  addonId: number;
  types?: OauthProviderType[];
};

type OauthProviderType = {
  type: string;
  name: string;
  icon?: string;
};

function getOauthBoundType(type: string, subtype?: string) {
  return subtype ? `${type}:${subtype}` : type;
}

/**
 */
@Provide()
@Controller('/api/oauth')
export class ConnectController extends BaseController {

  @Inject()
  addonGetterService: AddonGetterService;
  @Inject()
  sysSettingsService: SysSettingsService;
  @Inject()
  loginService: LoginService;
  @Inject()
  codeService: CodeService;
  @Inject()
  userService: UserService;

  @Inject()
  oauthBoundService: OauthBoundService;

  @Inject()
  addonService: AddonService;



  private async getOauthProvider(type: string) {
    const publicSettings = await this.sysSettingsService.getPublicSettings()
    if (!publicSettings?.oauthEnabled) {
      throw new Error("OAuth功能未启用");
    }
    const setting = publicSettings?.oauthProviders?.[type || ""] as OauthProviderSetting | undefined;
    if (!setting) {
      throw new Error(`未配置该OAuth类型:${type}`);
    }

    const addon = await this.addonGetterService.getAddonById(setting.addonId, true, 0,null);
    if (!addon) {
      throw new Error("初始化OAuth插件失败");
    }
    return {
      addon: addon as IOauthProvider,
      setting,
    };
  }

  @Post('/login', { description: Constants.per.guest })
  public async login(@Body(ALL) body: { type: string, subtype?: string, forType?:string ,from?:string }) {

    const oauthProvider = await this.getOauthProvider(body.type);
    const installInfo = await this.sysSettingsService.getSetting<SysInstallInfo>(SysInstallInfo);
    const bindUrl = installInfo?.bindUrl || "";
    //构造登录url
    const redirectUrl = `${bindUrl}api/oauth/callback/${body.type}`;

    let stateObj = {
      forType: body.forType || 'login',
    }
    const state = utils.hash.base64(JSON.stringify(stateObj))
    const { loginUrl, ticketValue } = await oauthProvider.addon.buildLoginUrl({
      redirectUri: redirectUrl,
      forType: body.forType,
      from: body.from || "web",
      subtype: body.subtype,
      state,
    });
    
    const ticket = this.codeService.setValidationValue({
      ...ticketValue,
      state,
      subtype: body.subtype,
    })
    this.ctx.cookies.set("oauth_ticket", ticket, {
      httpOnly: true,
      // secure: true,
      // sameSite: "strict",
    })
    return this.ok({ loginUrl, ticket });
  }


  @Get('/callback/:type', { description: Constants.per.guest })
  public async callback(@Param('type') type: string, @Query() query: Record<string, string>) {

    checkPlus()

    //处理登录回调
    const oauthProvider = await this.getOauthProvider(type);
    const request = this.ctx.request;
    // const ticketValue = this.codeService.getValidationValue(ticket);
    // if (!ticketValue) {
    //   throw new Error("登录ticket已过期");
    // }

    const ticket = this.ctx.cookies.get("oauth_ticket");
    if (!ticket) {
      throw new Error("ticket已过期");
    }
    const ticketValue = this.codeService.getValidationValue(ticket);
    if (!ticketValue) {
      throw new Error("ticketValue已过期");
    }

    const installInfo = await this.sysSettingsService.getSetting<SysInstallInfo>(SysInstallInfo);
    const bindUrl = installInfo?.bindUrl || "";
    const currentUrl = `${bindUrl}api/oauth/callback/${type}?${request.querystring}`
    try {
      const tokenRes = await oauthProvider.addon.onCallback({
        code: query.code,
        state: query.state,
        ticketValue,
        currentURL: new URL(currentUrl)
      });

      const userInfo = tokenRes.userInfo;

      const validationCode = await this.codeService.setValidationValue({
        type: getOauthBoundType(type, ticketValue.subtype),
        userInfo,
      });

      let state = {forType:""}
      if (query.state) {
        state = JSON.parse(utils.hash.base64Decode(query.state));
      }

      const redirectUrl = `${bindUrl}#/oauth/callback/${type}?validationCode=${validationCode}&forType=${state.forType}`;
      this.ctx.redirect(redirectUrl);
    } catch (err) {
      logger.error(err);
      this.ctx.redirect(`${bindUrl}#/oauth/callback/${type}?error=${err.error_description || err.message}`);
    }

  }

  @Post('/getLogoutUrl', { description: Constants.per.guest })
  public async logout(@Body(ALL) body: any) {
    checkPlus()
    const oauthProvider = await this.getOauthProvider(body.type);
    const { logoutUrl } = await oauthProvider.addon.buildLogoutUrl({
      ...body,
    });
    return this.ok({ logoutUrl });
  }


  @Post('/token', { description: Constants.per.guest })
  public async token(@Body(ALL) body: { validationCode: string, type: string }) {
    checkPlus()
    const validationValue = await this.codeService.getValidationValue(body.validationCode);
    if (!validationValue) {
      throw new Error("校验码错误");
    }

    const type = validationValue.type;
    if (type !== body.type && !type.startsWith(`${body.type}:`)) {
      throw new Error("校验码错误");
    }
    const userInfo = validationValue.userInfo;
    const openId = userInfo.openId;

    const loginRes = await this.loginService.loginByOpenId({ openId, type });
    if (loginRes == null) {

      return this.ok({
        bindRequired: true,
        validationCode: body.validationCode,
      });
    }

    this.writeTokenCookie(loginRes);
    //返回登录成功token
    return this.ok(loginRes);
  }

  private writeTokenCookie(token: { expire: any; token: any }) {
    // this.loginService.writeTokenCookie(this.ctx,token);
  }


  @Post('/autoRegister', { description: Constants.per.guest })
  public async autoRegister(@Body(ALL) body: { validationCode: string, type: string }) {

    const validationValue = this.codeService.getValidationValue(body.validationCode);
    if (!validationValue) {
      throw new Error("第三方认证授权已过期");
    }
    const userInfo = validationValue.userInfo;
    const oauthType = validationValue.type;
    let newUser = new UserEntity()
    newUser.username = `${userInfo.nickName}_${simpleNanoId(6)}_${oauthType}`;
    newUser.avatar = userInfo.avatar;
    newUser.nickName = userInfo.nickName || simpleNanoId(6);
    newUser.email = userInfo.email || "";

    newUser = await this.userService.register("username", newUser, async (txManager) => {
      const oauthBound: OauthBoundEntity = new OauthBoundEntity()
      oauthBound.userId = newUser.id;
      oauthBound.type = oauthType;
      oauthBound.openId = userInfo.openId;
      await txManager.save(oauthBound);
    });

    const loginRes = await this.loginService.generateToken(newUser);
    this.writeTokenCookie(loginRes);
    return this.ok(loginRes);
  }


  @Post('/bind', { description: Constants.per.loginOnly })
  public async bind(@Body(ALL) body: any) {
    //需要已登录
    const userId = this.getUserId();
    const validationValue = this.codeService.getValidationValue(body.validationCode);
    if (!validationValue) {
      throw new Error("校验码错误");
    }
    const type = validationValue.type;
    const userInfo = validationValue.userInfo;
    const openId = userInfo.openId;
    await this.oauthBoundService.bind({
      userId,
      type,
      openId,
    });
    return this.ok(1);
  }

  @Post('/unbind', { description: Constants.per.loginOnly })
  public async unbind(@Body(ALL) body: any) {
    //需要已登录
    const userId = this.getUserId();
    await this.oauthBoundService.unbind({
      userId,
      type: body.type,
    });
    return this.ok(1);
  }

   @Post('/bounds', { description: Constants.per.loginOnly })
  public async bounds(@Body(ALL) body: any) {
    //需要已登录
    const userId = this.getUserId();
    const bounds = await this.oauthBoundService.find({
      where :{
        userId,
      }
    });
    return this.ok(bounds);
  }


   @Post('/providers', { description: Constants.per.guest })
  public async providers() {
    const defineList = addonRegistry.getDefineList("oauth");

    const publicSetting = await this.sysSettingsService.getPublicSettings();
    const oauthProviders = publicSetting.oauthProviders || {};
    const list = [];

    for (const item of defineList) {
      const type = item.name 
      const conf = oauthProviders[type];
      const provider:any = {
        ...item,
      }
      delete provider.input
      if (conf && conf.addonId) {
        const addonEntity = await this.addonService.info(conf.addonId);
        if (addonEntity) {
          provider.addonId = conf.addonId;
          provider.addonTitle = addonEntity.name;

          const addon = await this.addonGetterService.getAddonById(conf.addonId,true,0,null) as IOauthProvider & { icon?: string; types?: OauthProviderType[] };
          const {logoutUrl} = await addon.buildLogoutUrl({});
          if (logoutUrl){
            provider.logoutUrl = logoutUrl;
          }
          if(addon.icon){
            provider.icon = addon.icon;
          }
          if(addon.types?.length){
            provider.types = addon.types;
          }
        }
      }
      if (provider.addonId && provider.types?.length) {
        for (const subtype of provider.types) {
          list.push({
            ...provider,
            name: type,
            subtype: subtype.type,
            title: subtype.name,
            icon: subtype.icon || provider.icon,
            addonTitle: subtype.name,
          });
        }
        continue;
      }
      list.push(provider);
    }

    return this.ok(list);
  }
}
