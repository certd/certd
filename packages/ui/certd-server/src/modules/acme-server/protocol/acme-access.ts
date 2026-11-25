import net from "node:net";
import { ValidateException } from "@certd/lib-server";

/** 将IP规范化为BigInt（v4按32位，v6按128位），IPv4-mapped IPv6归一为v4。 */
export function ipToBigInt(ip: string): bigint | null {
  let addr = String(ip || "").trim().replace(/^\[|\]$/g, "").replace(/%.*$/, "");
  if (!addr) {
    return null;
  }
  // IPv4-mapped IPv6 (::ffff:1.2.3.4) 归一为IPv4
  const mapped = addr.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) {
    addr = mapped[1];
  }
  const version = net.isIP(addr);
  if (version === 4) {
    const parts = addr.split(".").map(Number);
    if (parts.length !== 4 || parts.some(p => !Number.isInteger(p) || p < 0 || p > 255)) {
      return null;
    }
    return parts.reduce((acc, p) => (acc << 8n) | BigInt(p), 0n);
  }
  if (version === 6) {
    let canonical: string;
    try {
      canonical = new URL(`http://[${addr}]`).hostname.replace(/^\[|\]$/g, "");
    } catch {
      return null;
    }
    const [head, tail] = canonical.split("::");
    const h = head ? head.split(":").filter(Boolean) : [];
    const t = tail ? tail.split(":").filter(Boolean) : [];
    const missing = 8 - h.length - t.length;
    if (missing < 0) {
      return null;
    }
    const groups = [...h, ...Array(missing).fill("0"), ...t];
    if (groups.length !== 8) {
      return null;
    }
    let result = 0n;
    for (const g of groups) {
      const v = parseInt(g, 16);
      if (!Number.isInteger(v) || v < 0 || v > 0xffff) {
        return null;
      }
      result = (result << 16n) | BigInt(v);
    }
    return result;
  }
  return null;
}

function ruleBits(rule: string): number | null {
  const m = rule.match(/^(\d+)$/);
  if (!m) {
    return null;
  }
  return Number(m[1]);
}

/** 校验IP规则：裸IP、通配符octet(192.168.*.*)、CIDR(10.0.0.0/8, 2001:db8::/32)。 */
export function isValidIpRule(rule: string): boolean {
  const text = String(rule || "").trim();
  if (!text) {
    return false;
  }
  if (text.includes("/")) {
    const [base, prefixStr] = text.split("/");
    const version = net.isIP(base.replace(/^\[|\]$/g, ""));
    if (!version) {
      return false;
    }
    const prefix = ruleBits(prefixStr);
    const max = version === 4 ? 32 : 128;
    return prefix != null && prefix >= 0 && prefix <= max;
  }
  if (text.includes("*")) {
    // 仅IPv4通配符octet
    const parts = text.split(".");
    if (parts.length !== 4) {
      return false;
    }
    return parts.every(p => p === "*" || (/^\d+$/.test(p) && Number(p) >= 0 && Number(p) <= 255));
  }
  return net.isIP(text.replace(/^\[|\]$/g, "")) !== 0;
}

/** 判断IP是否匹配规则（精确/通配符/CIDR）。 */
export function matchesIpRule(ip: string, rule: string): boolean {
  const text = String(rule || "").trim();
  const ipValue = ipToBigInt(ip);
  if (ipValue == null) {
    return false;
  }
  if (text.includes("/")) {
    const [base, prefixStr] = text.split("/");
    const baseValue = ipToBigInt(base);
    const prefix = ruleBits(prefixStr);
    if (baseValue == null || prefix == null) {
      return false;
    }
    const baseVersion = net.isIP(base.replace(/^\[|\]$/g, ""));
    // IPv4-mapped归一后按v4比较
    const totalBits = baseVersion === 4 ? 32 : 128;
    const mask = prefix === 0 ? 0n : ((1n << BigInt(prefix)) - 1n) << BigInt(totalBits - prefix);
    return (ipValue & mask) === (baseValue & mask);
  }
  if (text.includes("*")) {
    const ipStr = String(ip).trim().replace(/^\[|\]$/g, "");
    if (net.isIP(ipStr) !== 4) {
      return false;
    }
    const ipParts = ipStr.split(".");
    const ruleParts = text.split(".");
    return ruleParts.every((p, i) => p === "*" || p === ipParts[i]);
  }
  const ruleValue = ipToBigInt(text);
  return ruleValue != null && ruleValue === ipValue;
}

export function matchIpAllowlist(ip: string, allowlist: string[]): boolean {
  if (!allowlist || allowlist.length === 0) {
    return true;
  }
  return allowlist.some(rule => matchesIpRule(ip, rule));
}

/** 未配置白名单时的默认放行范围：仅内网/回环地址。 */
export const DEFAULT_INTRANET_RULES = ["127.0.0.0/8", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "::1/128", "fc00::/7", "fe80::/10"];

/** 规范化IP白名单：trim/去空/校验，上限50。 */
export function normalizeIpAllowlist(list: any): string[] {
  if (list == null) {
    return [];
  }
  const arr = Array.isArray(list) ? list : String(list).split(/[\n,，\s]+/);
  const rules = arr.map(item => String(item).trim()).filter(Boolean);
  if (rules.length > 50) {
    throw new ValidateException("IP白名单最多配置50条");
  }
  for (const rule of rules) {
    if (!isValidIpRule(rule)) {
      throw new ValidateException(`IP白名单规则不合法：${rule}（支持裸IP/CIDR/IPv4通配符）`);
    }
  }
  return [...new Set(rules)];
}

export type RequiredHeader = { name: string; value: string };

/** 规范化自定义头白名单：校验头名/值，上限10。 */
export function normalizeRequiredHeaders(list: any): RequiredHeader[] {
  if (list == null) {
    return [];
  }
  if (!Array.isArray(list)) {
    throw new ValidateException("requiredHeaders必须是数组");
  }
  if (list.length > 10) {
    throw new ValidateException("自定义头白名单最多配置10条");
  }
  const result: RequiredHeader[] = [];
  for (const item of list) {
    const name = String(item?.name || "").trim();
    const value = String(item?.value ?? "");
    if (!name || !/^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/.test(name)) {
      throw new ValidateException(`自定义头名称不合法：${name}`);
    }
    result.push({ name, value });
  }
  return result;
}