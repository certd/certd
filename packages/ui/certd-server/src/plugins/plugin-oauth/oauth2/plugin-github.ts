import { AddonInput, BaseAddon, IsAddon } from "@certd/lib-server";
import { BuildLoginUrlReq, BuildLogoutUrlReq, IOauthProvider, OnCallbackReq } from "../api.js";

@IsAddon({
  addonType: "oauth",
  name: "github",
  title: "GitHub认证",
  desc: "GitHub OAuth2登录",
  icon: "simple-icons:github",
  showTest: false,
})
export class GithubOauthProvider extends BaseAddon implements IOauthProvider {
  @AddonInput({
    title: "ClientId",
    helper: "[GitHub Developer Settings](https://github.com/settings/developers)创建应用后获取",
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
    const scope = "user:email"; // Scope of the access request
    const authorizeEndpoint = "https://github.com/login/oauth/authorize";
    const redirectUrl = encodeURIComponent(params.redirectUri);
    const loginUrl = `${authorizeEndpoint}?client_id=${this.clientId}&redirect_uri=${redirectUrl}&response_type=code&scope=${scope}&state=${params.state}`;
    return {
      loginUrl,
      ticketValue: {},
    };
  }

  async onCallback(req: OnCallbackReq) {
    const code = req.code || "";

    const tokenEndpoint = "https://github.com/login/oauth/access_token";

    const uri = new URL(req.currentURL);
    const redirectUri = `${uri.origin}${uri.pathname}`;
    const res = await this.ctx.utils.http.request({
      url: tokenEndpoint,
      method: "post",
      headers: {
        Accept: "application/json",
      },
      data: {
        client_id: this.clientId,
        client_secret: this.clientSecretKey,
        code,
        redirect_uri: redirectUri,
      },
    });

    const tokens = res;

    const userInfoEndpoint = "https://api.github.com/user";

    // 获取用户信息
    const userInfoRes = await this.ctx.utils.http.request({
      url: userInfoEndpoint,
      method: "get",
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        Accept: "application/json",
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
        openId: userInfo.id,
        nickName: userInfo.login || userInfo.name || "",
        avatar: userInfo.avatar_url,
      },
    };
  }

  async buildLogoutUrl(params: BuildLogoutUrlReq) {
    return {};
  }
}
