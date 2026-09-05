import { cloneDeep } from "lodash-es";

export class BaseSettings {
  static __key__: string;
  static __title__: string;
  static __access__ = "private";

  static getCacheKey() {
    return "settings." + this.__key__;
  }
}

export class SysPublicSettings extends BaseSettings {
  static __key__ = "sys.public";
  static __title__ = "系统公共设置";
  static __access__ = "public";

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
  oauthOnly?: boolean = false;
  passkeyEnabled?: boolean = false;
  oauthAutoRedirect?: boolean = false;
  oauthAutoRegister?: boolean = false;
  oauthProviders: Record<
    string,
    {
      type: string;
      title: string;
      addonId: number;
      icon?: string;
    }
  > = {};

  notice?: string;

  adminMode?: "enterprise" | "saas" = "saas";
}

/**
 * 证书颁发机构配置（内置 + 自定义ACME，管理员在「流水线设置」中维护）
 * - 内置项（builtIn=true）：系统预置，前端不允许修改和删除
 * - 自定义项：sslProvider 为唯一标识（如 myca），配置后可在证书申请任务和ACME账号授权中作为颁发机构使用
 */
export type CustomAcmeProvider = {
  sslProvider: string;
  title: string;
  directoryUrl: string;
  // 反向代理地址（不带协议前缀，如 myca-proxy.example.com）；可选
  reverseProxy?: string;
  // 是否需要EAB（外部账号绑定）；内置CA与自定义CA均可配置，控制EAB输入框显隐与生成账号校验
  needEAB?: boolean;
  // 是否内置颁发机构（内置不允许修改删除）
  builtIn?: boolean;
  // 其他参数后期扩展
  [key: string]: any;
};

export class SysPrivateSettings extends BaseSettings {
  static __title__ = "系统私有设置";
  static __access__ = "private";
  static __key__ = "sys.private";
  jwtKey?: string;
  encryptSecret?: string;

  httpsProxy? = "";
  httpProxy? = "";
  noProxy? = "";
  commonHeaders?: string = "";

  // 已废弃：旧版「网络设置-反代设置」数据，仅用于兼容迁移（迁移到 customAcmeProviders 内置项的 reverseProxy）
  // 新配置统一在 customAcmeProviders 中维护，不再读取本字段做全局反代
  reverseProxies?: Record<string, string> = {};

  dnsResultOrder? = "";
  commonCnameEnabled?: boolean = true;

  httpRequestTimeout?: number = 30;

  pipelineMaxRunningCount?: number;

  environmentVars?: string = "";

  acmeWalkFromAuthoritative?: boolean = true;

  sms?: {
    type?: string;
    config?: any;
  } = {
    type: "aliyun",
    config: {},
  };

  // 证书颁发机构配置列表（内置 + 自定义ACME），内置项 builtIn=true 不允许修改删除。
  // 内置项不在此配置 Directory URL：其端点由运行时按加密算法（pkType）通过 acme.getDirectoryUrl 获取，
  // 例如 ZeroSSL、SSL.com 的 RSA 与 EC 证书使用不同的端点，写死单一 URL 会导致 EC 申请走错端点。
  customAcmeProviders?: CustomAcmeProvider[] = [
    { sslProvider: "letsencrypt", title: "Let's Encrypt", directoryUrl: "", needEAB: false, builtIn: true },
    { sslProvider: "letsencrypt_staging", title: "Let's Encrypt测试环境", directoryUrl: "", needEAB: false, builtIn: true },
    { sslProvider: "google", title: "Google", directoryUrl: "", needEAB: true, builtIn: true },
    { sslProvider: "zerossl", title: "ZeroSSL", directoryUrl: "", needEAB: true, builtIn: true },
    { sslProvider: "litessl", title: "litessl", directoryUrl: "", needEAB: true, builtIn: true },
    { sslProvider: "sslcom", title: "SSL.com", directoryUrl: "", needEAB: true, builtIn: true },
  ];

  removeSecret() {
    const clone = cloneDeep(this);
    delete clone.jwtKey;
    delete clone.encryptSecret;
    return clone;
  }
}

export class SysInstallInfo extends BaseSettings {
  static __title__ = "系统安装信息";
  static __key__ = "sys.install";
  static __access__ = "private";
  installTime?: number;
  siteId?: string;
  bindUserId?: number;
  bindUrl?: string;
  bindUrl2?: string;
  accountServerBaseUrl?: string;
  appKey?: string;
}

export class SysLicenseInfo extends BaseSettings {
  static __title__ = "授权许可信息";
  static __key__ = "sys.license";
  static __access__ = "private";
  license?: string;
}

export type EmailTemplate = {
  addonId?: number;
};

export class SysEmailConf extends BaseSettings {
  static __title__ = "邮箱配置";
  static __key__ = "sys.email";
  static __access__ = "private";

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

  templates: {
    registerCode?: EmailTemplate;
    forgotPassword?: EmailTemplate;
    pipelineResult?: EmailTemplate;
    common?: EmailTemplate;
  };
}

export class SysSiteInfo extends BaseSettings {
  static __title__ = "站点信息";
  static __key__ = "sys.site";
  static __access__ = "public";
  title?: string;
  slogan?: string;
  logo?: string;
  loginLogo?: string;
}

export class SysSecretBackup extends BaseSettings {
  static __title__ = "密钥信息备份";
  static __key__ = "sys.secret.backup";
  static __access__ = "private";
  siteId?: string;
  encryptSecret?: string;
}

/**
 * 不要修改
 */
export class SysSecret extends BaseSettings {
  static __title__ = "密钥信息";
  static __key__ = "sys.secret";
  static __access__ = "private";
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
  static __title__ = "顶部菜单";
  static __key__ = "sys.header.menus";
  static __access__ = "public";

  menus: MenuItem[];
}

export type PaymentItem = {
  enabled: boolean;
  accessId?: number;
};

export class SysPaymentSetting extends BaseSettings {
  static __title__ = "支付设置";
  static __key__ = "sys.payment";
  static __access__ = "private";

  yizhifu?: PaymentItem = { enabled: false };

  alipay?: PaymentItem = { enabled: false };

  wxpay?: PaymentItem = { enabled: false };
}

export class SysSuiteSetting extends BaseSettings {
  static __title__ = "套餐设置";
  static __key__ = "sys.suite";
  static __access__ = "private";

  enabled: boolean = false;

  allowSuiteStack: boolean = false;

  registerGift?: {
    productId: number;
    duration: number;
  };

  intro?: string;
}

export class SysAutoFixSetting extends BaseSettings {
  static __title__ = "自动修复记录";
  static __key__ = "sys.auto.fix";
  static __access__ = "private";

  fixed: Record<string, boolean> = {};
}

export type SiteHidden = {
  enabled: boolean;
  openPath?: string;
  //md5 hash 两次后保存
  openPassword?: string;
  autoHiddenTimes?: number;
  hiddenOpenApi?: boolean;
};
export class SysSafeSetting extends BaseSettings {
  static __title__ = "站点安全设置";
  static __key__ = "sys.safe";
  static __access__ = "private";

  // 站点隐藏
  hidden: SiteHidden = {
    enabled: false,
    hiddenOpenApi: false,
    autoHiddenTimes: 5,
  };
}

export class SysPluginSetting extends BaseSettings {
  static __title__ = "系统插件设置";
  static __key__ = "sys.plugin";
  static __access__ = "private";

  lastSyncTime?: number;
}
