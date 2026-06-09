export type OnCallbackReq = {
  code: string;
  state: string;
  currentURL: URL;
  ticketValue: any;
};

export type OauthToken = {
  userInfo: {
    openId: string;
    nickName: string;
    avatar: string;
  };
  token: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
};

export type OnBindReq = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  idToken: string;
  scope: string;
  tokenType: string;
  bindInfo: any;
};
export type OnBindReply = {
  success: boolean;
  message: string;
};

export type LoginUrlReply = {
  loginUrl: string;
  ticketValue: any;
};

export type BuildLoginUrlReq = {
  redirectUri: string;
  forType?: string;
  from?: string;
  subtype?: string;
  state?: string;
};

export type BuildLogoutUrlReq = {
  subtype?: string;
};

export type LogoutUrlReply = {
  logoutUrl?: string;
};

export interface IOauthProvider {
  buildLoginUrl: (params: BuildLoginUrlReq) => Promise<LoginUrlReply>;
  onCallback: (params: OnCallbackReq) => Promise<OauthToken>;
  buildLogoutUrl: (params: BuildLogoutUrlReq) => Promise<LogoutUrlReply>;
}
