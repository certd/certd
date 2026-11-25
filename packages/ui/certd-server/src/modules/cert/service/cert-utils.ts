import net from "node:net";
import { X509Certificate } from "node:crypto";
import * as x509 from "@peculiar/x509";

/**
 * 通用证书/域名工具，不依赖任何具体CA实现，供ACME协议层与Local CA共同使用。
 */
export function normalizeDomains(domains: string[]) {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const item of domains || []) {
    const domain = String(item || "")
      .trim()
      .toLowerCase();
    if (!domain) {
      continue;
    }
    if (domain.includes("*") && !domain.startsWith("*.")) {
      throw new Error(`域名格式错误：${domain}`);
    }
    if (domain.startsWith("*.") && !domain.slice(2)) {
      throw new Error(`域名格式错误：${domain}`);
    }
    if (seen.has(domain)) {
      continue;
    }
    seen.add(domain);
    result.push(domain);
  }
  if (result.length === 0) {
    throw new Error("域名不能为空");
  }
  return result;
}

export function matchAllowedDomains(domains: string[], allowedDomains: string[] = []) {
  if (!allowedDomains || allowedDomains.length === 0) {
    return;
  }
  const rules = allowedDomains
    .map(item =>
      String(item || "")
        .trim()
        .toLowerCase()
    )
    .filter(Boolean)
    .map(item => ({
      wildcard: item.startsWith("*."),
      suffix: item.startsWith("*.") ? item.slice(2) : item,
    }));
  if (rules.length === 0) {
    return;
  }
  for (const domain of domains) {
    if (net.isIP(domain)) {
      if (!rules.some(rule => !rule.wildcard && rule.suffix === domain)) {
        throw new Error(`域名 ${domain} 不在该CA允许签发的范围内`);
      }
      continue;
    }
    const isWildcard = domain.startsWith("*.");
    const host = isWildcard ? domain.slice(2) : domain;
    const matched = rules.some(rule => {
      if (rule.wildcard) {
        // RFC 6125/9525：*.example.com 仅匹配单层子域，不含 apex、不含多级子域
        if (host === rule.suffix) {
          return isWildcard;
        }
        if (!host.endsWith(`.${rule.suffix}`)) {
          return false;
        }
        const prefix = host.slice(0, host.length - rule.suffix.length - 1);
        return prefix.length > 0 && !prefix.includes(".");
      }
      return host === rule.suffix || host.endsWith(`.${rule.suffix}`);
    });
    if (!matched) {
      throw new Error(`域名 ${domain} 不在该CA允许签发的范围内`);
    }
  }
}

export function readCsrDomains(csr: x509.Pkcs10CertificateRequest) {
  const san = csr.extensions.find(ext => ext.type === "2.5.29.17") as x509.SubjectAlternativeNameExtension | undefined;
  // 仅接受 DNS/IP 类型的 SAN，拒绝 email/URI 等可伪造或无关类型
  const sanItems = (san?.names?.items ?? []).filter((item: any) => {
    const type = String(item?.type || "").toLowerCase();
    return type === "dns" || type === "ip" || type === "dnsname" || type === "ipaddress" || type === "2" || type === "7";
  });
  const sanDomains = sanItems.map((item: any) => item.value);
  if (sanDomains.length > 0) {
    return normalizeDomains(sanDomains);
  }
  const cn = csr.subjectName.getField("CN")[0];
  if (!cn) {
    throw new Error("CSR中缺少域名");
  }
  return normalizeDomains([cn]);
}

export function getCsrDomains(csrPem: string) {
  const csr = new x509.Pkcs10CertificateRequest(csrPem);
  return readCsrDomains(csr);
}

export function verifyCertIssuedBy(certPem: string, caCertPem: string) {
  try {
    const cert = new X509Certificate(certPem);
    const caCert = new X509Certificate(caCertPem);
    return cert.checkIssued(caCert) && cert.verify(caCert.publicKey);
  } catch (e) {
    return false;
  }
}

