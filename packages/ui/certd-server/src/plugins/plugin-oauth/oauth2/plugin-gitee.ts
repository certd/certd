import { AddonInput, BaseAddon, IsAddon } from "@certd/lib-server";
import { BuildLoginUrlReq, BuildLogoutUrlReq, IOauthProvider, OnCallbackReq } from "../api.js";

@IsAddon({
  addonType: "oauth",
  name: 'gitee',
  title: 'Gitee认证',
  desc: 'Gitee OAuth2登录',
  icon:"simple-icons:gitee:red",
  showTest: false,
})
export class GiteeOauthProvider extends BaseAddon implements IOauthProvider {

  @AddonInput({
    title: "ClientId",
    helper: "[gitee 第三方应用管理](https://gitee.com/oauth/applications)创建应用后获取",
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

  // @AddonInput({
  //   title: "授权地址",
  //   helper: "授权请求url",
  //   component: {
  //     placeholder: "https://xxxxx.com/oauth/authorize",
  //   },
  //   required: true,
  // })
  // authorizeEndpoint = "";

  /**
   * gitee.authorizeURL = https://gitee.com/oauth/authorize
gitee.accessToken = https://gitee.com/oauth/token
gitee.userInfo = https://gitee.com/api/v5/user
   */

  // @AddonInput({
  //   title: "Token获取地址",
  //   helper: "Token获取url",
  //   component: {
  //     placeholder: "https://xxxxx.com/oauth/token",
  //   },
  //   required: true,
  // })
  // tokenEndpoint = "";

  //  @AddonInput({
  //   title: "用户信息获取地址",
  //   helper: "用户信息url",
  //   component: {
  //     placeholder: "https://xxxxx.com/api/user_info",
  //   },
  //   required: true,
  // })
  // userInfoEndpoint = "";

  // @AddonInput({
  //   title: "Scope",
  //   helper: "授权Scope",
  //   value:"user_info",
  //   component: {
  //     placeholder: "profile",
  //   },
  //   required: true,
  // })
  // scope: string;


  
  async buildLoginUrl(params: BuildLoginUrlReq) {

    let scope = "user_info" // Scope of the access request
    const authorizeEndpoint = "https://gitee.com/oauth/authorize"
    const redirectUrl = encodeURIComponent(params.redirectUri)
    // https://gitee.com/oauth/authorize?client_id=5bb5f4158af41c50c7a17b5d9068244e97d3ee572def6a57ed32fd8c9d760ad1&redirect_uri=http%3A%2F%2Fcasdoor.docmirror.cn%3A8000%2Fcallback&response_type=code
    const loginUrl = `${authorizeEndpoint}?client_id=${this.clientId}&redirect_uri=${redirectUrl}&response_type=code&scope=${scope}&state=${params.state}`
    return {
      loginUrl,
      ticketValue: {
      },
    };
  }

  async onCallback(req: OnCallbackReq) {
    
    //校验state

    const code = req.code || ""

    const tokenEndpoint = "https://gitee.com/oauth/token"

    const uri = new URL(req.currentURL)
    const redirectUri = `${uri.origin}${uri.pathname}`
    const res = await this.ctx.utils.http.request( {
        url: tokenEndpoint,
        method: "post",
        data:{
        // https://gitee.com/oauth/token?
        // grant_type=authorization_code&code={code}&client_id={client_id}&redirect_uri={redirect_uri}&client_secret={client_secret}
          grant_type: "authorization_code",
          code,
          client_id: this.clientId,
          redirect_uri: redirectUri,
          client_secret: this.clientSecretKey,
        }
    })
    
    const tokens = res


    const userInfoEndpoint = "https://gitee.com/api/v5/user"

    // 获取用户信息
     const userInfoRes = await this.ctx.utils.http.request( {
        url: userInfoEndpoint,
        method: "get",
        params:{
          access_token: tokens.access_token,
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
        nickName: userInfo.name || userInfo.nick_name || "",
        avatar: userInfo.avatar_url,
      },
    }
  };

  async buildLogoutUrl(params: BuildLogoutUrlReq) {
    return {};
  }
}
