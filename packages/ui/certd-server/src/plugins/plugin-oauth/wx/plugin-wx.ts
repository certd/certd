import { AddonInput, BaseAddon, IsAddon } from "@certd/lib-server";
import { BuildLoginUrlReq, BuildLogoutUrlReq, IOauthProvider, OnCallbackReq } from "../api.js";

@IsAddon({
  addonType: "oauth",
  name: "wx",
  title: "微信登录",
  desc: "微信网站应用登录",
  icon: "ion:logo-wechat:green",
  showTest: false,
})
export class WxOauthProvider extends BaseAddon implements IOauthProvider {
  @AddonInput({
    title: "AppId",
    required: true,
    helper: "在[微信开放平台](https://open.weixin.qq.com/cgi-bin/index)注册网站应用后获取",
  })
  appId = "";

  @AddonInput({
    title: "AppSecretKey",
    component: {
      placeholder: "AppSecretKey",
    },
    required: true,
  })
  appSecretKey = "";

  wxAccessToken?: { access_token: string; expires_at: number };

  async buildLoginUrl(params: BuildLoginUrlReq) {
    const from = params.from || "web";
    const appId = this.appId;
    const redirect_uri = encodeURIComponent(params.redirectUri);
    let state: any = {
      forType: params.forType,
      from,
    };
    state = this.ctx.utils.hash.base64(JSON.stringify(state));
    let scope = "snsapi_userinfo";
    let loginUrl = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${appId}&redirect_uri=${redirect_uri}&response_type=code&scope=${scope}&state=${state}#wechat_redirect`;
    if (from === "web") {
      scope = "snsapi_login";
      loginUrl = `https://open.weixin.qq.com/connect/qrconnect?appid=${appId}&redirect_uri=${redirect_uri}&response_type=code&scope=${scope}&state=${state}#wechat_redirect`;
    }

    return {
      loginUrl,
      ticketValue: {
        state,
      },
    };
  }

  // async getWxAccessToken() {
  //   if (this.wxAccessToken && this.wxAccessToken.expires_at > Date.now()) {
  //     return this.wxAccessToken
  //   }
  //   const res = await this.http.request({
  //     url: "https://api.weixin.qq.com/cgi-bin/token",
  //     method: "GET",
  //     params: {
  //       appid: this.appId,
  //       secret: this.appSecretKey,
  //       grant_type: "client_credential",
  //     },
  //   })
  //   this.checkRet(res)
  //   this.wxAccessToken = {
  //     access_token: res.access_token,
  //     expires_at: Date.now() + res.expires_in * 1000,
  //   }
  //   return this.wxAccessToken
  // }

  checkRet(res: any) {
    if (res.errcode) {
      throw new Error(res.errmsg);
    }
  }

  async onCallback(req: OnCallbackReq) {
    // GET https://api.weixin.qq.com/sns/oauth2/access_token?appid=wx520c15f417810387&secret=SECRET&code=CODE&grant_type=authorization_code
    const res = await this.http.request({
      url: "https://api.weixin.qq.com/sns/oauth2/access_token",
      method: "GET",
      params: {
        appid: this.appId,
        secret: this.appSecretKey,
        code: req.code,
        grant_type: "authorization_code",
      },
    });
    this.checkRet(res);
    const accessToken = res.access_token;

    // GET https://api.weixin.qq.com/sns/userinfo?access_token=ACCESS_TOKEN&openid=OPENID&lang=zh_CN
    const userInfoRes = await this.http.request({
      url: "https://api.weixin.qq.com/sns/userinfo",
      method: "GET",
      params: {
        access_token: accessToken,
        openid: res.openid,
        lang: "zh_CN",
      },
    });
    this.checkRet(userInfoRes);

    return {
      token: {
        accessToken: res.access_token,
        refreshToken: res.refresh_token,
        expiresIn: res.expires_in,
      },
      userInfo: {
        openId: res.unionid || res.openid,
        nickName: userInfoRes.nickname || "",
        avatar: userInfoRes.headimgurl,
      },
    };
  }

  async buildLogoutUrl(params: BuildLogoutUrlReq) {
    return {};
  }
}
