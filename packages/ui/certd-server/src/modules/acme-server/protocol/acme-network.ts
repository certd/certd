import dns from "node:dns/promises";
import http from "node:http";
import net from "node:net";

const MAX_BODY_BYTES = 4096;
const REQUEST_TIMEOUT = 10000;

function isPublicIpv4(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127 || a >= 224) {
    return false;
  }
  if (a === 169 && b === 254) {
    return false;
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return false;
  }
  if (a === 192 && b === 168) {
    return false;
  }
  if (a === 192 && b === 88 && parts[2] === 99) {
    return false;
  }
  if (a === 100 && b >= 64 && b <= 127) {
    return false;
  }
  if (a === 198 && (b === 18 || b === 19)) {
    return false;
  }
  if ((a === 192 && b === 0 && parts[2] === 0) || (a === 192 && b === 0 && parts[2] === 2) || (a === 198 && b === 51 && parts[2] === 100) || (a === 203 && b === 0 && parts[2] === 113)) {
    return false;
  }
  if (a === 255 && b === 255 && parts[2] === 255 && parts[3] === 255) {
    return false;
  }
  return true;
}

function ipv4FromInt(value: number) {
  return `${(value >>> 24) & 0xff}.${(value >>> 16) & 0xff}.${(value >>> 8) & 0xff}.${value & 0xff}`;
}

function ipv6ToBigInt(address: string): bigint | null {
  let text = address.split("%")[0].toLowerCase();
  const lastColon = text.lastIndexOf(":");
  const tail = text.slice(lastColon + 1);
  if (tail.includes(".")) {
    const parts = tail.split(".").map(Number);
    if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) {
      return null;
    }
    const hi = ((parts[0] << 8) | parts[1]).toString(16);
    const lo = ((parts[2] << 8) | parts[3]).toString(16);
    text = `${text.slice(0, lastColon + 1)}${hi}:${lo}`;
  }
  const sections = text.split("::");
  if (sections.length > 2) {
    return null;
  }
  const parseGroups = (section: string) => {
    if (!section) {
      return [];
    }
    return section.split(":");
  };
  const left = parseGroups(sections[0]);
  const right = sections.length === 2 ? parseGroups(sections[1]) : [];
  const groupPattern = /^[0-9a-f]{1,4}$/;
  if ([...left, ...right].some(group => !groupPattern.test(group))) {
    return null;
  }
  if (sections.length === 1 && left.length !== 8) {
    return null;
  }
  const missing = 8 - left.length - right.length;
  if (sections.length === 2 && missing <= 0) {
    return null;
  }
  const groups = [...left, ...Array(Math.max(0, missing)).fill("0"), ...right].map(group => parseInt(group, 16));
  if (groups.length !== 8 || groups.some(group => !Number.isInteger(group) || group < 0 || group > 0xffff)) {
    return null;
  }
  let value = 0n;
  for (const group of groups) {
    value = (value << 16n) | BigInt(group);
  }
  return value;
}

function isPublicIpv6(address: string) {
  const value = ipv6ToBigInt(address);
  if (value == null) {
    return false;
  }
  const high96 = value >> 32n;
  // IPv4-mapped ::ffff:0:0/96 按内嵌IPv4判断；已废弃的 IPv4-compatible ::/96 直接拒绝
  if (high96 === 0xffffn) {
    return isPublicIpv4(ipv4FromInt(Number(value & 0xffffffffn)));
  }
  if (high96 === 0n) {
    return false;
  }
  // 仅允许 2000::/3 全球单播
  if (value >> 125n !== 1n) {
    return false;
  }
  const high16 = Number(value >> 112n);
  if (high16 === 0x2001) {
    const secondGroup = Number((value >> 96n) & 0xffffn);
    // 2001::/23 包含 Teredo、ORCHID、基准测试等特殊用途地址
    if (secondGroup <= 0x1ff) {
      return false;
    }
  }
  if (value >> 96n === 0x20010db8n) {
    // 2001:db8::/32 文档地址
    return false;
  }
  if (high16 === 0x2002 || high16 === 0x3fff) {
    // 6to4 与 3fff::/20 文档地址
    return false;
  }
  return true;
}

export function isPublicIp(address: string) {
  const value = String(address || "").trim();
  const version = net.isIP(value);
  if (version === 4) {
    return isPublicIpv4(value);
  }
  if (version === 6) {
    return isPublicIpv6(value);
  }
  return false;
}

export async function resolvePublicAddresses(hostname: string) {
  const records = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!records.length) {
    throw new Error(`域名 ${hostname} 没有解析记录，无法完成 HTTP-01 校验`);
  }
  const unsafe = records.filter(item => !isPublicIp(item.address));
  if (unsafe.length > 0) {
    throw new Error(`域名 ${hostname} 解析到内网或保留地址（${unsafe.map(item => item.address).join(", ")}），拒绝 HTTP-01 校验`);
  }
  return records;
}

async function requestChallenge(address: string, hostname: string, path: string) {
  return await new Promise<string>((resolve, reject) => {
    const req = http.request(
      {
        host: address,
        port: 80,
        path,
        method: "GET",
        headers: { Host: hostname, Connection: "close" },
        timeout: REQUEST_TIMEOUT,
      },
      res => {
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`HTTP-01校验失败，状态码：${res.statusCode}`));
          return;
        }
        let size = 0;
        let body = "";
        res.setEncoding("utf8");
        res.on("data", chunk => {
          size += Buffer.byteLength(chunk);
          if (size > MAX_BODY_BYTES) {
            req.destroy(new Error("HTTP-01校验响应过大"));
            return;
          }
          body += chunk;
        });
        res.on("end", () => resolve(body.trim()));
      }
    );
    req.on("timeout", () => req.destroy(new Error("HTTP-01校验超时")));
    req.on("error", reject);
    req.end();
  });
}

/**
 * HTTP-01 校验：解析并拒绝私网/回环/保留地址，固定 80 端口，不跟随重定向，
 * 将连接固定到已校验的 IP，避免 DNS 重绑定。
 */
export async function fetchHttpChallenge(hostname: string, token: string, expected: string) {
  const addresses = await resolvePublicAddresses(hostname);
  const path = `/.well-known/acme-challenge/${token}`;
  let lastError: Error;
  for (const item of addresses) {
    try {
      const body = await requestChallenge(item.address, hostname, path);
      if (body !== expected) {
        throw new Error("HTTP-01校验内容不匹配");
      }
      return;
    } catch (e: any) {
      lastError = e;
    }
  }
  throw lastError || new Error("HTTP-01校验失败");
}
