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

export function isPublicIp(address: string) {
  const value = String(address || "").trim();
  const version = net.isIP(value);
  if (version === 4) {
    return isPublicIpv4(value);
  }
  if (version === 6) {
    const lower = value.toLowerCase();
    if (lower === "::" || lower === "::1") {
      return false;
    }
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) {
      return isPublicIpv4(mapped[1]);
    }
    if (/^fe[89ab]/.test(lower) || /^f[cd]/.test(lower) || lower.startsWith("ff")) {
      return false;
    }
    if (lower.startsWith("2001:db8")) {
      return false;
    }
    return true;
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
