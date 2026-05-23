import Validator from "async-validator";
import { DomainsVerifyPlanInput } from "./type";
import { $t } from "/@/locales";

function checkDomainVerifyPlan(rule: any, value: DomainsVerifyPlanInput) {
  if (value == null) {
    return true;
  }
  for (const domain in value) {
    const type = value[domain].type;
    if (type === "cname") {
      const subDomains = Object.keys(value[domain].cnameVerifyPlan);
      if (subDomains.length > 0) {
        for (const subDomain of subDomains) {
          const plan = value[domain].cnameVerifyPlan[subDomain];
          if (plan.status !== "valid") {
            throw new Error($t("certd.verifyPlan.errors.cnameNotValid", { domain: subDomain }));
          }
        }
      }
    } else if (type === "http") {
      const domains = value[domain].domains || [];
      for (const item of domains) {
        //如果有通配符域名则不允许使用http校验
        if (item.startsWith("*.")) {
          throw new Error($t("certd.verifyPlan.errors.wildcardNotSupportHttp", { domain: item }));
        }
      }

      const subDomains = Object.keys(value[domain].httpVerifyPlan);
      if (subDomains.length > 0) {
        for (const subDomain of subDomains) {
          const plan = value[domain].httpVerifyPlan[subDomain];
          if (!plan.httpUploaderType) {
            throw new Error($t("certd.verifyPlan.errors.uploadMethodRequired", { domain: subDomain }));
          }
          if (!plan.httpUploaderAccess) {
            throw new Error($t("certd.verifyPlan.errors.uploadAccessRequired", { domain: subDomain }));
          }
          if (!plan.httpUploadRootDir) {
            throw new Error($t("certd.verifyPlan.errors.websiteRootRequired", { domain: subDomain }));
          }
        }
      }
    } else if (type === "dns") {
      if (!value[domain].dnsProviderType || !value[domain].dnsProviderAccessId) {
        throw new Error($t("certd.verifyPlan.errors.dnsProviderRequired", { domain }));
      }
    } else if (type === "dns-persist") {
      const subDomains = Object.keys(value[domain].dnsPersistVerifyPlan || {});
      for (const subDomain of subDomains) {
        const plan = value[domain].dnsPersistVerifyPlan[subDomain];
        if (plan.status !== "valid") {
          throw new Error(`DNS持久验证记录（${subDomain}）还未校验成功`);
        }
      }
    }
  }
  return true;
}
// 注册自定义验证器
Validator.register("checkDomainVerifyPlan", checkDomainVerifyPlan);
