import { AddonInput, BaseAddon, IsAddon } from "@certd/lib-server";
import { BuildLoginUrlReq, BuildLogoutUrlReq, IOauthProvider, OnCallbackReq } from "../api.js";

@IsAddon({
  addonType: "oauth",
  name: "google",
  title: "Google认证",
  desc: "Google OAuth2登录",
  icon: "simple-icons:google",
  showTest: false,
})
export class GoogleOauthProvider extends BaseAddon implements IOauthProvider {
  @AddonInput({
    title: "ClientId",
    helper: "[Google Cloud Console](https://console.cloud.google.com/apis/credentials)创建应用后获取",
    required: true,
  })
  clientId = "";

  @AddonInput({
    title: "ClientSecretKey",
    component: {
      placeholder: "ClientSecretKey / appSecretKey",
    },
    required: true,
  })
  clientSecretKey = "";

  async buildLoginUrl(params: BuildLoginUrlReq) {
    const scope = "email profile"; // Scope of the access request

    const authorizeEndpoint = "https://accounts.google.com/o/oauth2/auth";
    const redirectUrl = encodeURIComponent(params.redirectUri);
    const loginUrl = `${authorizeEndpoint}?client_id=${this.clientId}&redirect_uri=${redirectUrl}&response_type=code&scope=${scope}&state=${params.state}`;
    return {
      loginUrl,
      ticketValue: {},
    };
  }

  async onCallback(req: OnCallbackReq) {
    const code = req.code || "";

    const tokenEndpoint = "https://oauth2.googleapis.com/token";

    const uri = new URL(req.currentURL);
    const redirectUri = `${uri.origin}${uri.pathname}`;
    const res = await this.ctx.utils.http.request({
      url: tokenEndpoint,
      method: "post",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      data: {
        client_id: this.clientId,
        client_secret: this.clientSecretKey,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      },
    });

    const tokens = res;

    const userInfoEndpoint = "https://www.googleapis.com/oauth2/v3/userinfo";

    // 获取用户信息
    const userInfoRes = await this.ctx.utils.http.request({
      url: userInfoEndpoint,
      method: "get",
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });
    const userInfo = userInfoRes;

    return {
      token: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
      },
      userInfo: {
        openId: userInfo.sub,
        nickName: userInfo.name || userInfo.email || "",
        avatar: userInfo.picture,
      },
    };
  }

  async buildLogoutUrl(params: BuildLogoutUrlReq) {
    return {};
  }
}
