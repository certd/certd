import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { SysAutoFixSetting, SysSettingsService } from "@certd/lib-server";
import { GoogleCommonEabAccountKeyFix } from "./google-common-eab-account-key-fix.js";
import { OauthSubtypeBoundTypeFix } from "./oauth-subtype-bound-type-fix.js";
import { CertInfoWildcardDomainCountFix } from "./cert-info-wildcard-domain-count-fix.js";
import { SuiteContentWildcardDomainCountFix } from "./suite-content-wildcard-domain-count-fix.js";

type AutoFixTask = {
  key: string;
  fix: {
    init(): Promise<void>;
  };
};

@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class AutoFix {
  @Inject()
  sysSettingsService: SysSettingsService;

  @Inject()
  googleCommonEabAccountKeyFix: GoogleCommonEabAccountKeyFix;

  @Inject()
  oauthSubtypeBoundTypeFix: OauthSubtypeBoundTypeFix;

  @Inject()
  certInfoWildcardDomainCountFix: CertInfoWildcardDomainCountFix;

  @Inject()
  suiteContentWildcardDomainCountFix: SuiteContentWildcardDomainCountFix;

  async init() {
    const setting = await this.sysSettingsService.getSetting<SysAutoFixSetting>(SysAutoFixSetting);
    setting.fixed = setting.fixed || {};
    const tasks: AutoFixTask[] = [
      {
        key: "google-common-eab-account-key",
        fix: this.googleCommonEabAccountKeyFix,
      },
      {
        key: "oauth-subtype-bound-type",
        fix: this.oauthSubtypeBoundTypeFix,
      },
      {
        key: "cert-info-wildcard-domain-count",
        fix: this.certInfoWildcardDomainCountFix,
      },
      {
        key: "suite-content-wildcard-domain-count",
        fix: this.suiteContentWildcardDomainCountFix,
      },
    ];

    for (const task of tasks) {
      if (setting.fixed?.[task.key]) {
        continue;
      }
      await task.fix.init();
      setting.fixed[task.key] = true;
      await this.sysSettingsService.saveSetting(setting);
    }
  }
}
