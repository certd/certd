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
}

export class SysPrivateSettings extends BaseSettings {
  static __title__ = '系统私有设置';
  static __access__ = 'private';
  static __key__ = 'sys.private';
}

export class SysInstallInfo extends BaseSettings {
  static __title__ = '系统安装信息';
  static __key__ = 'sys.install';
  static __access__ = 'private';
  installTime: number;
  siteId?: string;
}

export class SysLicenseInfo extends BaseSettings {
  static __title__ = '授权许可信息';
  static __key__ = 'sys.license';
  static __access__ = 'private';
  license?: string;
}
