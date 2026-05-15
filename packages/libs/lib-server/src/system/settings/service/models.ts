import { cloneDeep } from 'lodash-es';

export class BaseSettings {
  static __key__: string;
  static __title__: string;
  static __access__ = 'private';

  static getCacheKey() {
    return 'settings.' + this.__key__;
  }
}

export class SysPublicSettings extends BaseSettings {
  static __key__ = 'sys.public';
  static __title__ = '系统公共设置';
  static __access__ = 'public';

  registerEnabled = false;
  userValidTimeEnabled?: boolean = false;
  passwordLoginEnabled = true;
  usernameRegisterEnabled = true;
  mobileRegisterEnabled = false;
  smsLoginEnabled = false;
  useSmsLoginDefault = true;
  emailRegisterEnabled = false;
  selfServicePasswordRetrievalEnabled = false;

  limitUserPipelineCount = 0;
  managerOtherUserPipeline = false;
  icpNo?: string;
  mpsNo?: string;
  customFooter?: string;
  robots?: boolean = true;
  aiChatEnabled = true;
  homePageEnabled = true;


  //验证码是否开启
  captchaEnabled = false;
  //验证码类型
  captchaType?: string;
  captchaAddonId?: number;



  //流水线是否启用有效期
  pipelineValidTimeEnabled?: boolean = false;


  //证书域名添加到监控
  certDomainAddToMonitorEnabled?: boolean = false;

  // 固定证书有效期天数，0表示不固定
  fixedCertExpireDays?: number;

  //默认到期前更新天数
  defaultCertRenewDays?: number;
  // 即将到期天数
  defaultWillExpireDays?: number = 15;

  // 第三方OAuth配置
  oauthEnabled?: boolean = false;
  oauthProviders: Record<string, {
    type: string;
    title: string;
    addonId: number;
    icon?: string;
  }> = {};

  notice?: string;

  adminMode?: "enterprise" | "saas" = "saas";
}

export class SysPrivateSettings extends BaseSettings {
  static __title__ = '系统私有设置';
  static __access__ = 'private';
  static __key__ = 'sys.private';
  jwtKey?: string;
  encryptSecret?: string;

  httpsProxy? = '';
  httpProxy? = '';
  commonHeaders?: string = '';

  reverseProxies?: Record<string, string> = {};

  dnsResultOrder? = '';
  commonCnameEnabled?: boolean = true;

  httpRequestTimeout?: number = 30;

  pipelineMaxRunningCount?: number;


  environmentVars?: string = '';


  acmeWalkFromAuthoritative?: boolean = true;


  sms?: {
    type?: string;
    config?: any;
  } = {
      type: 'aliyun',
      config: {},
    };

  removeSecret() {
    const clone = cloneDeep(this);
    delete clone.jwtKey;
    delete clone.encryptSecret;
    return clone;
  }
}

export class SysInstallInfo extends BaseSettings {
  static __title__ = '系统安装信息';
  static __key__ = 'sys.install';
  static __access__ = 'private';
  installTime?: number;
  siteId?: string;
  bindUserId?: number;
  bindUrl?: string;
  bindUrl2?: string;
  accountServerBaseUrl?: string;
  appKey?: string;
}

export class SysLicenseInfo extends BaseSettings {
  static __title__ = '授权许可信息';
  static __key__ = 'sys.license';
  static __access__ = 'private';
  license?: string;
}


export type EmailTemplate = {
  addonId?: number;
}

export class SysEmailConf extends BaseSettings {
  static __title__ = '邮箱配置';
  static __key__ = 'sys.email';
  static __access__ = 'private';

  host: string;
  port: number;
  auth: {
    user: string;
    pass: string;
  };
  secure: boolean; // use TLS
  tls: {
    // do not fail on invalid certs
    rejectUnauthorized: boolean;
  };
  sender: string;
  usePlus?: boolean;

  templates:{
    registerCode?: EmailTemplate,
    forgotPassword?: EmailTemplate,
    pipelineResult?: EmailTemplate,
    common?: EmailTemplate,
  }
}

export class SysSiteInfo extends BaseSettings {
  static __title__ = '站点信息';
  static __key__ = 'sys.site';
  static __access__ = 'public';
  title?: string;
  slogan?: string;
  logo?: string;
  loginLogo?: string;
}

export class SysSecretBackup extends BaseSettings {
  static __title__ = '密钥信息备份';
  static __key__ = 'sys.secret.backup';
  static __access__ = 'private';
  siteId?: string;
  encryptSecret?: string;
}

/**
 * 不要修改
 */
export class SysSecret extends BaseSettings {
  static __title__ = '密钥信息';
  static __key__ = 'sys.secret';
  static __access__ = 'private';
  siteId?: string;
  encryptSecret?: string;
}

export class SysSiteEnv {
  agent?: {
    enabled?: boolean;
    contactText?: string;
    contactLink?: string;
  };
}

export type MenuItem = {
  id: string;
  title: string;
  icon: string;
  link: string;
  auth: boolean;
  permission?: string;
  children?: MenuItem[];
};
export class SysHeaderMenus extends BaseSettings {
  static __title__ = '顶部菜单';
  static __key__ = 'sys.header.menus';
  static __access__ = 'public';

  menus: MenuItem[];
}

export type PaymentItem = {
  enabled: boolean;
  accessId?: number;
};

export class SysPaymentSetting extends BaseSettings {
  static __title__ = '支付设置';
  static __key__ = 'sys.payment';
  static __access__ = 'private';

  yizhifu?: PaymentItem = { enabled: false };

  alipay?: PaymentItem = { enabled: false };

  wxpay?: PaymentItem = { enabled: false };
}

export class SysSuiteSetting extends BaseSettings {
  static __title__ = '套餐设置';
  static __key__ = 'sys.suite';
  static __access__ = 'private';

  enabled: boolean = false;

  registerGift?: {
    productId: number;
    duration: number;
  };

  intro?: string;
}

export class SysAutoFixSetting extends BaseSettings {
  static __title__ = '自动修复记录';
  static __key__ = 'sys.auto.fix';
  static __access__ = 'private';

  fixed: Record<string, boolean> = {};
}


export type SiteHidden = {
  enabled: boolean;
  openPath?: string;
  //md5 hash 两次后保存
  openPassword?: string;
  autoHiddenTimes?: number;
  hiddenOpenApi?: boolean
};
export class SysSafeSetting extends BaseSettings {
  static __title__ = '站点安全设置';
  static __key__ = 'sys.safe';
  static __access__ = 'private';

  // 站点隐藏
  hidden: SiteHidden = {
    enabled: false,
    hiddenOpenApi: false,
    autoHiddenTimes: 5,
  };
}
