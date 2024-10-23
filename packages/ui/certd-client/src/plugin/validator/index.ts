import Validator from "async-validator";
// 自定义验证器函数
export function isDomain(rule: any, value: any) {
  if (value == null) {
    return true;
  }
  let domains: string[] = value;
  if (typeof value === "string") {
    domains = value.split(",");
  }

  const allowDotStart = rule.allowDotStart ? "\\.|" : "";
  const exp = `^(?:${allowDotStart}\\*\\.|[0-9a-zA-Z\u4e00-\u9fa5-]+\\.)+[0-9a-zA-Z\u4e00-\u9fa5-]+$`;
  const compiled = new RegExp(exp);
  for (const domain of domains) {
    //域名可以是泛域名，中文域名，数字域名，英文域名，域名中可以包含-和. ,可以_开头

    if (!compiled.test(domain)) {
      throw new Error(`域名有误：${domain}，请输入正确的域名`);
    }
  }
  return true;
}
// 注册自定义验证器
Validator.register("domains", isDomain);
