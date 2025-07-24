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
};
export type SysPublicSetting = {
  registerEnabled?: boolean;
  userValidTimeEnabled?: boolean;
  usernameRegisterEnabled?: boolean;
  mobileRegisterEnabled?: boolean;
  emailRegisterEnabled?: boolean;
  passwordLoginEnabled?: boolean;
  smsLoginEnabled?: boolean;
  selfServicePasswordRetrievalEnabled?: boolean;

  limitUserPipelineCount?: number;
  managerOtherUserPipeline?: boolean;
  icpNo?: string;
  mpsNo?: string;
  robots?: boolean;
  aiChatEnabled?: boolean;

  showRunStrategy?: boolean;
};
export type SuiteSetting = {
  enabled?: boolean;
};
export type SysPrivateSetting = {
  httpProxy?: string;
  httpsProxy?: string;
  dnsResultOrder?: string;
  commonCnameEnabled?: boolean;
  sms?: {
    type?: string;
    config?: any;
  };
};
export type SysInstallInfo = {
  siteId: string;
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
