import { AddonInput, BaseAddon, IsAddon } from "@certd/lib-server";
import { BuildLoginUrlReq, BuildLogoutUrlReq, IOauthProvider, OnCallbackReq } from "../api.js";
import { IconSets } from "../iconsets.js";

@IsAddon({
  addonType: "oauth",
  name: 'oidc',
  title: 'OIDC认证',
  desc: 'OpenID Connect 认证，统一认证服务',
  icon:"simple-icons:fusionauth:#006be6",
  showTest: false,
})
export class OidcOauthProvider extends BaseAddon implements IOauthProvider {

  @AddonInput({
    title: "自定义图标",
    component: {
      name:"fs-icon-selector",
      vModel:"modelValue",
      iconSets: IconSets,
    },
    required: false,
  })
  icon = "";

  @AddonInput({
    title: "ClientId",
    helper: "ClientId / appId",
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

  @AddonInput({
    title: "服务地址",
    helper: "Issuer地址，服务发现地址去掉/.well-known/openid-configuration",
    component: {
      placeholder: "https://oidc.example.com/oidc",
    },
    required: true,
  })
  issuerUrl = "";


  async getClient() {
    const client = await import('openid-client')
    let server = new URL(this.issuerUrl)// Authorization Server's Issuer Identifier

    let config = await client.discovery(
      server,
      this.clientId,
      this.clientSecretKey,
    )

    // console.log(config.serverMetadata())

    return {
      config,
      client
    }
  }
  
  async buildLoginUrl(params: BuildLoginUrlReq) {
    const { config, client } = await this.getClient()

    let redirect_uri = new URL(params.redirectUri)
    let scope = 'openid profile' // Scope of the access request
    /**
     * PKCE: The following MUST be generated for every redirect to the
     * authorization_endpoint. You must store the code_verifier and state in the
     * end-user session such that it can be recovered as the user gets redirected
     * from the authorization server back to your application.
     */
    let code_verifier = client.randomPKCECodeVerifier()
    let code_challenge = await client.calculatePKCECodeChallenge(code_verifier)
    let state:any = {
      forType: params.forType || 'login',
    }
    state = this.ctx.utils.hash.base64(JSON.stringify(state))

    let parameters: any = {
      redirect_uri,
      scope,
      code_challenge,
      code_challenge_method: 'S256',
      state,
      nonce: client.randomNonce(),
    }

    let redirectTo = client.buildAuthorizationUrl(config, parameters)
    return {
      loginUrl: redirectTo.href,
      ticketValue: {
        codeVerifier: code_verifier,
        state,
        nonce: parameters.nonce,
      },
    };
  }

  async onCallback(req: OnCallbackReq) {
    const { config, client } = await this.getClient()

    
    let tokens: any = await client.authorizationCodeGrant(
      config,
      req.currentURL,
      {
        expectedState: req.ticketValue.state,
        pkceCodeVerifier: req.ticketValue.codeVerifier,
        expectedNonce: req.ticketValue.nonce,
      }
    )

    const claims = tokens.claims()
    return {
      token:{
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
      },
      userInfo: {
        openId: claims.sub,
        nickName: claims.nickname || claims.name || claims.username || claims.preferred_username || "",
        avatar: claims.picture,
        email: claims.email || "",
      },
    }
  };

  async buildLogoutUrl(params: BuildLogoutUrlReq) {
    try{
      const { config } = await this.getClient()
      let logoutUrl =  config.serverMetadata().end_session_endpoint
      return {
        logoutUrl: logoutUrl,
      };
    }catch(err){
      this.logger.error(`获取注销地址失败: ${err}`)
      return {
        logoutUrl: "",
      };
    }
  }
}
