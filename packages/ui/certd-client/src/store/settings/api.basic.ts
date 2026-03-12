import { request } from "/src/api/service";

export type SiteEnv = {
  agent?: {
    enabled?: boolean;
    contactText?: string;
    contactLink?: string;
  };
};
export type AppInfo = {
  version?: string;
  time?: number;
  deltaTime?: number;
};
export type SiteInfo = {
  title?: string;
  slogan?: string;
  logo?: string;
  loginLogo?: string;
  icpNo?: string;
  licenseTo?: string;
  licenseToUrl?: string;
};

export type PlusInfo = {
  vipType?: string;
  expireTime?: number;
  isPlus: boolean;
  isComm?: boolean;
  message?: string;
};
export type SysPublicSetting = {
  registerEnabled?: boolean;
  userValidTimeEnabled?: boolean;
  usernameRegisterEnabled?: boolean;
  mobileRegisterEnabled?: boolean;
  emailRegisterEnabled?: boolean;
  passwordLoginEnabled?: boolean;
  smsLoginEnabled?: boolean;
  defaultLoginType?: string;
  selfServicePasswordRetrievalEnabled?: boolean;

  limitUserPipelineCount?: number;
  managerOtherUserPipeline?: boolean;
  icpNo?: string;
  mpsNo?: string;
  robots?: boolean;
  aiChatEnabled?: boolean;

  showRunStrategy?: boolean;

  captchaEnabled?: boolean;
  captchaType?: number;
  captchaAddonId?: number;

  //流水线是否启用有效期
  pipelineValidTimeEnabled?: boolean;

  // 默认到期前更新天数
  defaultCertRenewDays?: number;
  // 默认即将到期天数
  defaultWillExpireDays?: number;

  //证书域名添加到监控
  certDomainAddToMonitorEnabled?: boolean;

  // 固定证书有效期天数，0表示不固定
  fixedCertExpireDays?: number;

  // 第三方OAuth配置
  oauthEnabled?: boolean;
  // 是否自动注册用户
  oauthAutoRegister?: boolean;
  // 是否自动跳转第三方登录
  oauthAutoRedirect?: boolean;
  // 是否仅允许使用第三方登录
  oauthOnly?: boolean;
  // 第三方OAuth登录提供者配置
  oauthProviders?: Record<
    string,
    {
      type: string;
      title: string;
      addonId: number;
    }
  >;
  // 系统通知
  notice?: string;

  // 管理员模式
  adminMode?: "enterprise" | "saas";
};
export type SuiteSetting = {
  enabled?: boolean;
};
export type SysPrivateSetting = {
  httpProxy?: string;
  httpsProxy?: string;
  reverseProxies?: any;
  dnsResultOrder?: string;
  commonCnameEnabled?: boolean;
  // 同一个用户同时最大运行流水线数量
  pipelineMaxRunningCount?: number;
  // 环境变量
  environmentVars?: string;

  sms?: {
    type?: string;
    config?: any;
  };

  //http请求超时时间
  httpRequestTimeout?: number;
};
export type SysInstallInfo = {
  siteId: string;
  bindUrl?: string;
  bindUrl2?: string;
};
export type MenuItem = {
  id: string;
  title: string;
  icon?: string;
  path?: string;
  children?: MenuItem[];
};
export type HeaderMenus = {
  menus: MenuItem[];
};

export type AllSettings = {
  sysPublic: SysPublicSetting;
  installInfo: SysInstallInfo;
  plusInfo: PlusInfo;
  siteInfo: SiteInfo;
  siteEnv: SiteEnv;
  headerMenus: HeaderMenus;
  suiteSetting: SuiteSetting;
  app: AppInfo;
};

export async function loadAllSettings(): Promise<AllSettings> {
  return await request({
    url: "/basic/settings/all",
    method: "get",
  });
}

export async function bindUrl(data: any): Promise<any> {
  return await request({
    url: "/sys/plus/bindUrl",
    method: "post",
    data,
  });
}

export async function sendSmsCode(data: any): Promise<any> {
  return await request({
    url: "/basic/code/sendSmsCode",
    method: "post",
    data,
  });
}

export async function sendEmailCode(data: any): Promise<any> {
  return await request({
    url: "/basic/code/sendEmailCode",
    method: "post",
    data,
  });
}

export async function getProductInfo(): Promise<any> {
  return await request({
    url: "/basic/settings/productInfo",
    method: "get",
    showErrorNotify: false,
  });
}
