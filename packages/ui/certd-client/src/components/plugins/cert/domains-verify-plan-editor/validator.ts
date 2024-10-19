import Validator from "async-validator";
import { DomainsVerifyPlanInput } from "./type";

function checkCnameVerifyPlan(rule, value: DomainsVerifyPlanInput) {
  if (value == null) {
    return true;
  }
  for (const domain in value) {
    if (value[domain].type === "cname") {
      const subDomains = Object.keys(value[domain].cnameVerifyPlan);
      if (subDomains.length > 0) {
        for (const subDomain of subDomains) {
          const plan = value[domain].cnameVerifyPlan[subDomain];
          if (plan.status !== "valid") {
            throw new Error(`域名${subDomain}的CNAME未验证通过，请先设置CNAME记录，点击验证按钮`);
          }
        }
      }
    } else {
      if (value[domain].dnsProviderType == null || value[domain].dnsProviderAccessId == null) {
        throw new Error(`DNS模式下，域名${domain}的DNS类型和授权信息必须填写`);
      }
    }
  }
  return true;
}
// 注册自定义验证器
Validator.register("checkCnameVerifyPlan", checkCnameVerifyPlan);
