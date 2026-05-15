import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { GoogleCommonEabAccountKeyFix } from "./google-common-eab-account-key-fix.js";
import { OauthSubtypeBoundTypeFix } from "./oauth-subtype-bound-type-fix.js";
import { CertInfoWildcardDomainCountFix } from "./cert-info-wildcard-domain-count-fix.js";
import { SuiteContentWildcardDomainCountFix } from "./suite-content-wildcard-domain-count-fix.js";

@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class AutoFix {
  @Inject()
  googleCommonEabAccountKeyFix: GoogleCommonEabAccountKeyFix;

  @Inject()
  oauthSubtypeBoundTypeFix: OauthSubtypeBoundTypeFix;

  @Inject()
  certInfoWildcardDomainCountFix: CertInfoWildcardDomainCountFix;

  @Inject()
  suiteContentWildcardDomainCountFix: SuiteContentWildcardDomainCountFix;

  async init() {
    await this.googleCommonEabAccountKeyFix.init();
    await this.oauthSubtypeBoundTypeFix.init();
    await this.certInfoWildcardDomainCountFix.init();
    await this.suiteContentWildcardDomainCountFix.init();
  }
}
