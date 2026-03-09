import { AddonInput, BaseAddon, IsAddon } from "@certd/lib-server";
import { BuildLoginUrlReq, BuildLogoutUrlReq, IOauthProvider, OnCallbackReq } from "../api.js";

@IsAddon({
  addonType: "oauth",
  name: 'microsoft',
  title: 'Microsoft认证',
  desc: 'Microsoft OAuth2登录',
  icon:"simple-icons:microsoft",
  showTest: false,
})
export class MicrosoftOauthProvider extends BaseAddon implements IOauthProvider {

  @AddonInput({
    title: "ClientId",
    helper: "[Microsoft Entra ID](https://portal.azure.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/RegisteredApps)创建应用后获取",
    required: true,
  })
  clientId = "";

  @AddonInput({
    title: "ClientSecretKey",
    component: {
      placeholder: "ClientSecretKey / appSecretKey",
    },
    helper:"客户端凭据->证书与机密->客户端密码->新客户端密码",
    required: true,
  })
  clientSecretKey = "";

  @AddonInput({
    title: "TenantId",
    component: {
      placeholder: "common 或 租户ID",
    },
    helper:"根据受支持的账户类型填写 common 或 租户ID，默认为common(Microsoft个人账户)。 \n租户ID获取: 概述 -> 目录(租户) ID ",
    value: "common",
    required: false,
  })
  tenantId = "common";

  async buildLoginUrl(params: BuildLoginUrlReq) {

    let scope = "openid profile email User.Read" // Scope of the access request
    let state:any = {
      forType: params.forType || 'login',
    }
    state = this.ctx.utils.hash.base64(JSON.stringify(state))

    const authorizeEndpoint = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/authorize`
    const redirectUrl = encodeURIComponent(params.redirectUri)
    const loginUrl = `${authorizeEndpoint}?client_id=${this.clientId}&redirect_uri=${redirectUrl}&response_type=code&scope=${scope}&state=${state}`
    return {
      loginUrl,
      ticketValue: {
        state,
      },
    };
  }

  async onCallback(req: OnCallbackReq) {
    
    const code = req.code || ""
    if (!code) {
      throw new Error("Missing code parameter");
    }

    const tokenEndpoint = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`

    const uri = new URL(req.currentURL)
    const redirectUri = `${uri.origin}${uri.pathname}`
    
    // 构建 form-urlencoded 格式的数据
    const formData = new URLSearchParams();
    formData.append('client_id', this.clientId);
    formData.append('client_secret', this.clientSecretKey);
    formData.append('code', code);
    formData.append('redirect_uri', redirectUri);
    formData.append('grant_type', 'authorization_code');

    const res = await this.ctx.utils.http.request( {
        url: tokenEndpoint,
        method: "post",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json"
        },
        data: formData.toString()
    })
    
    const tokens = res

    const userInfoEndpoint = "https://graph.microsoft.com/v1.0/me"

    // 获取用户信息
     const userInfoRes = await this.ctx.utils.http.request( {
        url: userInfoEndpoint,
        method: "get",
        headers: {
          "Authorization": `Bearer ${tokens.access_token}`,
          "Accept": "application/json"
        }
    })
    const userInfo = userInfoRes

    return {
      token:{
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
      },
      userInfo: {
        openId: userInfo.id,
        nickName: userInfo.displayName || userInfo.userPrincipalName || "",
        avatar: userInfo.avatar || "",
      },
    }
  };

  async buildLogoutUrl(params: BuildLogoutUrlReq) {
    return {};
  }
}