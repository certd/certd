import Validator from "async-validator";

export async function validateIpAddress(_rule: unknown, value: unknown) {
  if (value === undefined || value === null || value === "") {
    return;
  }
  const address = String(value).trim();
  const parts = address.split("/");
  const [ip, prefix] = parts;
  let valid = false;
  if (parts.length > 2) {
    valid = false;
  } else if (ip.includes("*")) {
    const octets = ip.split(".");
    valid = octets.length >= 1 && octets.length <= 4 && prefix === undefined && octets.every(octet => octet === "*" || (/^(0|[1-9]\d{0,2})$/.test(octet) && Number(octet) <= 255));
  } else if (ip.includes(":")) {
    // 限制为地址字符，避免 URL 解析接受路径、端口等额外内容。
    if (/^[0-9a-fA-F:.]+$/.test(ip)) {
      valid = isIpv6(ip) && (prefix === undefined || (/^\d+$/.test(prefix) && Number(prefix) <= 128));
    }
  } else {
    const octets = ip.split(".");
    valid = octets.length === 4 && octets.every(octet => /^(0|[1-9]\d{0,2})$/.test(octet) && Number(octet) <= 255) && (prefix === undefined || (/^\d+$/.test(prefix) && Number(prefix) <= 32));
  }
  if (!valid) {
    throw new Error("请输入有效的 IP 地址");
  }
}

function isIpv6(d: string) {
  if (!d) {
    return false;
  }
  // const isIPv6Regex = /^([0-9A-Fa-f]{0,4}:){2,7}([0-9A-Fa-f]{1,4}$|((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\.|$)){4})$/gm;
  // return isIPv6Regex.test(d);

  try {
    // 尝试构造URL，用IPv6作为hostname
    new URL(`http://[${d}]`);
    return true;
  } catch {
    return false;
  }
}
function isIpv4(d: string) {
  if (!d) {
    return false;
  }
  const isIPv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  return isIPv4Regex.test(d);
}
function isIp(d: string) {
  if (!d) {
    return false;
  }
  return isIpv4(d) || isIpv6(d);
}

// 自定义验证器函数
export function isDomain(rule: any, value: any) {
  if (value == null || value == "") {
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
    if (isIp(domain)) {
      continue;
    }
    if (!compiled.test(domain)) {
      throw new Error(`域名有误：${domain}，请输入正确的域名`);
    }
  }
  return true;
}

// 注册自定义验证器
Validator.register("domains", isDomain);

export function isFilePath(rule: any, value: any) {
  if (value == null) {
    return true;
  }
  // 文件名不能用*?"<>|等特殊符号
  if (!/^[^*?"<>|]*$/.test(value)) {
    throw new Error(`文件名不能包含*?"<>|等特殊字符`);
  }
  return true;
}
Validator.register("filepath", isFilePath);
