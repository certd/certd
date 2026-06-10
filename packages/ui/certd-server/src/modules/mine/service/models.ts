import { BaseSettings } from "@certd/lib-server";

export type TwoFactorAuthenticator = {
  enabled: boolean;
  secret?: string;
  type?: string;
  verified?: boolean;
};

export class UserTwoFactorSetting extends BaseSettings {
  static __title__ = "用户多重认证设置";
  static __key__ = "user.two.factor";

  authenticator: TwoFactorAuthenticator = {
    enabled: false,
    verified: false,
  };
}

export class UserSiteMonitorSetting extends BaseSettings {
  static __title__ = "站点监控设置";
  static __key__ = "user.site.monitor";

  notificationId?: number = 0;
  cron?: string = undefined;
  retryTimes?: number = 3;
  dnsServer?: string[] = undefined;
  certValidDays?: number = 14;
}

export class UserDomainMonitorSetting extends BaseSettings {
  static __title__ = "域名到期监控设置";
  static __key__ = "user.domain.monitor";

  enabled?: boolean = false;
  notificationId?: number = 0;
  cron?: string = undefined;
  willExpireDays?: number = 30;
}

export class UserEmailSetting extends BaseSettings {
  static __title__ = "用户邮箱设置";
  static __key__ = "user.email";

  list: string[] = [];
}

export class UserGrantSetting extends BaseSettings {
  static __title__ = "用户授权设置";
  static __key__ = "user.grant";

  allowAdminViewCerts = false;
}

export class UserDomainImportSetting extends BaseSettings {
  static __title__ = "用户域名导入设置";
  static __key__ = "user.domain.import";

  domainImportList: { dnsProviderType: string; dnsProviderAccessId: number; key: string; title: string; icon?: string }[];
}

export class UserSiteInfoImportSetting extends BaseSettings {
  static __title__ = "用户站点证书监控导入设置";
  static __key__ = "user.siteInfo.import";

  siteInfoImportList: { dnsProviderType: string; dnsProviderAccessId: number; key: string; title: string; icon?: string; groupId?: number }[];
}
