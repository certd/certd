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
  managerOtherUserPipeline = false;
  icpNo?: string;
  // triggerOnStartup = false;
}

export class SysPrivateSettings extends BaseSettings {
  static __title__ = '系统私有设置';
  static __access__ = 'private';
  static __key__ = 'sys.private';
  jwtKey?: string;
  encryptSecret?: string;

  httpsProxy? = '';
  httpProxy? = '';

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
  accountServerBaseUrl?: string;
  appKey?: string;
}

export class SysLicenseInfo extends BaseSettings {
  static __title__ = '授权许可信息';
  static __key__ = 'sys.license';
  static __access__ = 'private';
  license?: string;
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
