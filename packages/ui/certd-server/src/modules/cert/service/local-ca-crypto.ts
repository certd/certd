import crypto, { X509Certificate } from "node:crypto";
import net from "node:net";
// @ts-ignore
import * as x509 from "@peculiar/x509";

const webcrypto = crypto.webcrypto as unknown as Crypto;
x509.cryptoProvider.set(webcrypto);

export type LocalCaKeyType = "rsa2048" | "rsa3072" | "rsa4096" | "ecdsa256" | "ecdsa384";
export type LocalCaUsage = "server" | "client" | "both";

export type LocalCaSubject = {
  CN: string;
  O?: string;
  OU?: string;
  C?: string;
  ST?: string;
  L?: string;
};

export type CreatedRootCa = {
  certPem: string;
  privateKeyPem: string;
  keySize: number;
  keyType?: LocalCaKeyType;
  subject: LocalCaSubject;
  subjectCn: string;
  fingerprintSha256: string;
  notBefore: number;
  notAfter: number;
  pathLength?: number;
};

export type ImportedRootCa = CreatedRootCa;

export type CreateCsrResult = {
  csrPem: string;
  privateKeyPem: string;
  keySize: number;
};

export type SignCsrResult = {
  certPem: string;
  chainPem: string;
  fullchainPem: string;
  serialNumber: string;
  notBefore: number;
  notAfter: number;
};

export type CrlEntryInput = {
  serialNumber: string;
  revokeTime?: number;
};

export type CrlResult = {
  pem: string;
  der: Buffer;
  thisUpdate: number;
  nextUpdate: number;
};

export type IssueLeafResult = SignCsrResult & {
  crt: string;
  key: string;
};

export function filterAllowedDomains(domains: string[], allowedDomains: string[] = []) {
  if (!allowedDomains || allowedDomains.length === 0) {
    return domains;
  }
  return domains.filter(domain => {
    try {
      matchAllowedDomains([domain], allowedDomains);
      return true;
    } catch (e) {
      return false;
    }
  });
}

export function getX509Summary(certPem: string) {
  const firstCert = String(certPem || "").match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/)?.[0] || certPem;
  const cert = new x509.X509Certificate(firstCert);
  const kuExt: any = cert.extensions.find((ext: any) => ext.type === "2.5.29.15");
  const ekuExt: any = cert.extensions.find((ext: any) => ext.type === "2.5.29.37");
  const bcExt: any = cert.extensions.find((ext: any) => ext.type === "2.5.29.19");
  const keyUsage: string[] = [];
  const usages = Number(kuExt?.usages || 0);
  const usageFlags = x509.KeyUsageFlags;
  const usageNames: [number, string][] = [
    [usageFlags.digitalSignature, "digitalSignature"],
    [usageFlags.nonRepudiation, "nonRepudiation"],
    [usageFlags.keyEncipherment, "keyEncipherment"],
    [usageFlags.dataEncipherment, "dataEncipherment"],
    [usageFlags.keyAgreement, "keyAgreement"],
    [usageFlags.keyCertSign, "keyCertSign"],
    [usageFlags.cRLSign, "cRLSign"],
    [usageFlags.encipherOnly, "encipherOnly"],
    [usageFlags.decipherOnly, "decipherOnly"],
  ];
  for (const [flag, name] of usageNames) {
    if (usages & flag) {
      keyUsage.push(name);
    }
  }
  const ekuNames: Record<string, string> = {
    "1.3.6.1.5.5.7.3.1": "serverAuth",
    "1.3.6.1.5.5.7.3.2": "clientAuth",
    "1.3.6.1.5.5.7.3.3": "codeSigning",
    "1.3.6.1.5.5.7.3.4": "emailProtection",
    "1.3.6.1.5.5.7.3.8": "timeStamping",
    "1.3.6.1.5.5.7.3.9": "ocspSigning",
  };
  const extKeyUsage = (ekuExt?.usages || []).map((oid: string) => ekuNames[oid] || oid);
  return {
    serialNumber: cert.serialNumber.toUpperCase(),
    subject: cert.subject,
    issuer: cert.issuer,
    notBefore: cert.notBefore.getTime(),
    notAfter: cert.notAfter.getTime(),
    ca: Boolean(bcExt?.ca),
    keyUsage,
    extKeyUsage,
    signatureAlgorithm: cert.signatureAlgorithm?.hash?.name ? `${cert.signatureAlgorithm.name} (${cert.signatureAlgorithm.hash.name})` : cert.signatureAlgorithm?.name || "",
  };
}

export function keySizeOf(keyType: LocalCaKeyType) {
  if (keyType === "rsa3072") return 3072;
  if (keyType === "rsa4096") return 4096;
  if (keyType === "ecdsa256") return 256;
  if (keyType === "ecdsa384") return 384;
  return 2048;
}

function isEcKeyType(keyType: LocalCaKeyType) {
  return keyType === "ecdsa256" || keyType === "ecdsa384";
}

function signingAlgorithmOf(keyType: LocalCaKeyType) {
  if (keyType === "ecdsa256") {
    return { name: "ECDSA", hash: "SHA-256" };
  }
  if (keyType === "ecdsa384") {
    return { name: "ECDSA", hash: "SHA-384" };
  }
  return { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" };
}

function keyTypeOfPrivateKey(privateKey: crypto.KeyObject): { keyType: LocalCaKeyType; keySize: number } {
  const details: any = privateKey.asymmetricKeyDetails || {};
  if (privateKey.asymmetricKeyType === "rsa") {
    const keySize = details.modulusLength;
    if (keySize === 2048 || keySize === 3072 || keySize === 4096) {
      return { keyType: `rsa${keySize}` as LocalCaKeyType, keySize };
    }
    throw new Error("仅支持 RSA 2048/3072/4096");
  }
  if (privateKey.asymmetricKeyType === "ec") {
    if (details.namedCurve === "prime256v1") {
      return { keyType: "ecdsa256", keySize: 256 };
    }
    if (details.namedCurve === "secp384r1") {
      return { keyType: "ecdsa384", keySize: 384 };
    }
    throw new Error("仅支持 ECDSA P-256/P-384");
  }
  throw new Error("仅支持 RSA 或 ECDSA 私钥");
}

export function sha256Hex(text: string) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

export function normalizePem(pem: string) {
  return String(pem || "").trim() + "\n";
}

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
  const prefixes = allowedDomains
    .map(item =>
      String(item || "")
        .trim()
        .toLowerCase()
    )
    .filter(Boolean)
    .map(item => (item.startsWith("*.") ? item.slice(2) : item));
  if (prefixes.length === 0) {
    return;
  }
  for (const domain of domains) {
    if (net.isIP(domain)) {
      if (!prefixes.includes(domain)) {
        throw new Error(`域名 ${domain} 不在该CA允许签发的范围内`);
      }
      continue;
    }
    const host = domain.startsWith("*.") ? domain.slice(2) : domain;
    const matched = prefixes.some(prefix => host === prefix || host.endsWith(`.${prefix}`));
    if (!matched) {
      throw new Error(`域名 ${domain} 不在该CA允许签发的范围内`);
    }
  }
}

function toPem(der: ArrayBuffer | Buffer, label = "PRIVATE KEY") {
  const base64 = Buffer.from(der as any)
    .toString("base64")
    .match(/.{1,64}/g)
    ?.join("\n");
  return `-----BEGIN ${label}-----\n${base64}\n-----END ${label}-----\n`;
}

function randomSerialHex() {
  const bytes = crypto.randomBytes(16);
  bytes[0] &= 0x7f;
  return bytes.toString("hex").toUpperCase();
}

function buildName(subject: LocalCaSubject) {
  const attrs: any[] = [];
  for (const key of ["CN", "O", "OU", "C", "ST", "L"] as const) {
    const value = subject[key];
    if (value) {
      attrs.push({ [key]: [String(value)] });
    }
  }
  return new x509.Name(attrs);
}

function nameToSubject(name: x509.Name): LocalCaSubject {
  const subject: any = {};
  const json = name.toJSON() as any[];
  for (const item of json) {
    for (const key of Object.keys(item)) {
      const value = item[key]?.[0];
      if (value != null) {
        subject[key] = String(value);
      }
    }
  }
  return subject;
}

function fingerprintOf(certPem: string) {
  const cert = new X509Certificate(certPem);
  return cert.fingerprint256.replaceAll(":", "").toLowerCase();
}

async function generateKeyPair(keyType: LocalCaKeyType) {
  const keySize = keySizeOf(keyType);
  const keys = isEcKeyType(keyType)
    ? ((await webcrypto.subtle.generateKey(
        {
          name: "ECDSA",
          namedCurve: keyType === "ecdsa384" ? "P-384" : "P-256",
        },
        true,
        ["sign", "verify"]
      )) as CryptoKeyPair)
    : ((await webcrypto.subtle.generateKey(
        {
          name: "RSASSA-PKCS1-v1_5",
          modulusLength: keySize,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: "SHA-256",
        },
        true,
        ["sign", "verify"]
      )) as CryptoKeyPair);
  const pkcs8 = await webcrypto.subtle.exportKey("pkcs8", keys.privateKey);
  return {
    keys,
    privateKeyPem: toPem(pkcs8),
    keySize,
    keyType,
    signingAlgorithm: signingAlgorithmOf(keyType),
  };
}

async function importSigningKey(privateKeyPem: string) {
  const privateKey = crypto.createPrivateKey(privateKeyPem);
  const { keyType } = keyTypeOfPrivateKey(privateKey);
  const keyDer = x509.PemConverter.decodeFirst(privateKeyPem);
  if (isEcKeyType(keyType)) {
    const signingKey = await webcrypto.subtle.importKey("pkcs8", keyDer, { name: "ECDSA", namedCurve: keyType === "ecdsa384" ? "P-384" : "P-256" }, false, ["sign"]);
    return { signingKey, signingAlgorithm: signingAlgorithmOf(keyType), keyType };
  }
  const signingKey = await webcrypto.subtle.importKey("pkcs8", keyDer, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  return { signingKey, signingAlgorithm: signingAlgorithmOf(keyType), keyType };
}

function sanExtension(domains: string[]) {
  const names: x509.JsonGeneralNames = domains.map(domain => ({
    type: (net.isIP(domain) ? x509.IP : x509.DNS) as any,
    value: domain,
  }));
  return new x509.SubjectAlternativeNameExtension(names);
}

function readCsrDomains(csr: x509.Pkcs10CertificateRequest) {
  const san = csr.extensions.find(ext => ext.type === "2.5.29.17") as x509.SubjectAlternativeNameExtension | undefined;
  const sanDomains = san?.names?.items?.map(item => item.value) ?? [];
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

export async function createRootCa(req: { subject: LocalCaSubject; keyType: LocalCaKeyType; validityYears: number }): Promise<CreatedRootCa> {
  if (!req.subject?.CN) {
    throw new Error("CA名称(CN)不能为空");
  }
  const validityYears = Math.max(1, Math.min(20, req.validityYears || 10));
  const keyType = req.keyType || "rsa2048";
  const { keys, privateKeyPem, keySize, signingAlgorithm } = await generateKeyPair(keyType);
  const notBefore = new Date(Date.now() - 5 * 60 * 1000);
  const notAfter = new Date(notBefore.getTime() + validityYears * 365 * 24 * 3600 * 1000);
  const name = buildName(req.subject);
  const cert = await x509.X509CertificateGenerator.createSelfSigned(
    {
      serialNumber: randomSerialHex(),
      name,
      notBefore,
      notAfter,
      keys,
      signingAlgorithm,
      extensions: [
        new x509.BasicConstraintsExtension(true, 1, true),
        new x509.KeyUsagesExtension(x509.KeyUsageFlags.keyCertSign | x509.KeyUsageFlags.cRLSign | x509.KeyUsageFlags.digitalSignature, true),
        await x509.SubjectKeyIdentifierExtension.create(keys.publicKey, false, webcrypto),
      ],
    },
    webcrypto
  );
  const certPem = cert.toString("pem");
  return {
    certPem: normalizePem(certPem),
    privateKeyPem: normalizePem(privateKeyPem),
    keySize,
    keyType,
    subject: req.subject,
    subjectCn: req.subject.CN,
    fingerprintSha256: fingerprintOf(certPem),
    notBefore: notBefore.getTime(),
    notAfter: notAfter.getTime(),
    pathLength: 1,
  };
}

export function isSelfSignedCa(certPem: string) {
  const cert = new X509Certificate(certPem);
  return cert.ca && cert.verify(cert.publicKey);
}

export function getPublicKeyPem(certPem: string) {
  const cert = new X509Certificate(certPem);
  return cert.publicKey.export({ type: "spki", format: "pem" }).toString();
}

export function getCrlInfo(crlPem: string) {
  const crl = new x509.X509Crl(crlPem);
  const crlNumberExt: any = crl.extensions.find((ext: any) => ext.type === "2.5.29.20");
  return {
    issuer: crl.issuer,
    thisUpdate: crl.thisUpdate.getTime(),
    nextUpdate: crl.nextUpdate?.getTime(),
    crlNumber: crlNumberExt ? derIntegerToString(Buffer.from(crlNumberExt.value)) : undefined,
    entries: crl.entries.map(entry => ({
      serialNumber: entry.serialNumber,
      revocationDate: entry.revocationDate?.getTime(),
      reason: entry.reason,
    })),
  };
}

function derIntegerToString(value: Buffer) {
  try {
    let offset = 0;
    if (value[offset++] !== 0x02) return undefined;
    let length = value[offset++];
    if (length & 0x80) {
      const count = length & 0x7f;
      length = 0;
      for (let i = 0; i < count; i++) {
        length = (length << 8) | value[offset++];
      }
    }
    const bytes = value.subarray(offset, offset + length);
    return BigInt(`0x${bytes.toString("hex") || "0"}`).toString();
  } catch (e) {
    return undefined;
  }
}

export function getCertSerialNumber(certPem: string) {
  const cert = new X509Certificate(certPem);
  return cert.serialNumber.toUpperCase();
}

export function getBasicConstraints(certPem: string) {
  const cert = new x509.X509Certificate(certPem);
  const ext: any = cert.extensions.find((item: any) => item.type === "2.5.29.19");
  return {
    ca: Boolean(ext?.ca),
    pathLength: ext?.pathLength,
  };
}

export async function createIntermediateCa(req: { rootCertPem: string; rootPrivateKeyPem: string; subject: LocalCaSubject; keyType?: LocalCaKeyType; validityYears?: number }): Promise<CreatedRootCa> {
  if (!req.subject?.CN) {
    throw new Error("中间CA名称(CN)不能为空");
  }
  const rootCert = new x509.X509Certificate(req.rootCertPem);
  const constraints = getBasicConstraints(req.rootCertPem);
  if (!constraints.ca) {
    throw new Error("上级证书不是CA证书");
  }
  if (constraints.pathLength === 0) {
    throw new Error("上级根CA的pathlen=0，不能签发中间CA；请新建一个pathlen>=1的根CA");
  }
  const keyType = req.keyType || "rsa2048";
  const { keys, privateKeyPem, keySize } = await generateKeyPair(keyType);
  const now = Date.now();
  const notBefore = new Date(now - 5 * 60 * 1000);
  const requestedYears = Math.max(1, Math.min(10, req.validityYears || 5));
  const rootLimit = rootCert.notAfter.getTime() - 24 * 3600 * 1000;
  const notAfter = new Date(Math.min(notBefore.getTime() + requestedYears * 365 * 24 * 3600 * 1000, rootLimit));
  if (notAfter.getTime() <= notBefore.getTime()) {
    throw new Error("上级CA剩余有效期不足，无法签发中间CA");
  }
  const { signingKey, signingAlgorithm } = await importSigningKey(req.rootPrivateKeyPem);
  const cert = await x509.X509CertificateGenerator.create(
    {
      serialNumber: randomSerialHex(),
      subject: buildName(req.subject),
      issuer: rootCert.subjectName,
      notBefore,
      notAfter,
      publicKey: keys.publicKey,
      signingKey,
      signingAlgorithm,
      extensions: [
        new x509.BasicConstraintsExtension(true, 0, true),
        new x509.KeyUsagesExtension(x509.KeyUsageFlags.keyCertSign | x509.KeyUsageFlags.cRLSign | x509.KeyUsageFlags.digitalSignature, true),
        await x509.SubjectKeyIdentifierExtension.create(keys.publicKey, false, webcrypto),
        await x509.AuthorityKeyIdentifierExtension.create(rootCert.publicKey, false, webcrypto),
      ],
    },
    webcrypto
  );
  const certPem = cert.toString("pem");
  return {
    certPem: normalizePem(certPem),
    privateKeyPem: normalizePem(privateKeyPem),
    keySize,
    keyType,
    subject: req.subject,
    subjectCn: req.subject.CN,
    fingerprintSha256: fingerprintOf(certPem),
    notBefore: notBefore.getTime(),
    notAfter: notAfter.getTime(),
    pathLength: 0,
  };
}

export async function validateImportedRootCa(req: { certPem: string; privateKeyPem: string }): Promise<ImportedRootCa> {
  const certPem = normalizePem(req.certPem);
  const privateKeyPem = normalizePem(req.privateKeyPem);
  let cert: X509Certificate;
  let privateKey: crypto.KeyObject;
  try {
    cert = new X509Certificate(certPem);
  } catch (e: any) {
    throw new Error(`CA证书解析失败：${e.message}`);
  }
  try {
    privateKey = crypto.createPrivateKey(privateKeyPem);
  } catch (e: any) {
    throw new Error(`CA私钥解析失败：${e.message}`);
  }
  if (!cert.ca) {
    throw new Error("导入的证书不是CA证书");
  }
  const constraints = getBasicConstraints(certPem);
  if (constraints.pathLength === 0) {
    throw new Error("导入的根CA pathlen=0，不能签发中间CA，请使用pathlen>=1的根CA");
  }
  const now = Date.now();
  if (new Date(cert.validTo).getTime() <= now) {
    throw new Error("导入的CA证书已过期");
  }
  if (new Date(cert.validFrom).getTime() > now + 5 * 60 * 1000) {
    throw new Error("导入的CA证书尚未生效");
  }
  try {
    if (!cert.verify(cert.publicKey)) {
      throw new Error("导入的CA证书不是自签名根CA");
    }
  } catch (e: any) {
    throw new Error(`CA证书验签失败：${e.message}`);
  }
  const { keyType, keySize } = keyTypeOfPrivateKey(privateKey);
  if (!cert.checkPrivateKey(privateKey)) {
    throw new Error("CA私钥与CA证书不匹配");
  }
  const x509Cert = new x509.X509Certificate(certPem);
  const subject = nameToSubject(x509Cert.subjectName);
  if (!subject.CN) {
    throw new Error("CA证书缺少CommonName");
  }
  const pkcs8Pem = privateKey
    .export({
      type: "pkcs8",
      format: "pem",
    })
    .toString();
  return {
    certPem,
    privateKeyPem: normalizePem(pkcs8Pem),
    keySize,
    keyType,
    subject,
    subjectCn: subject.CN,
    fingerprintSha256: cert.fingerprint256.replaceAll(":", "").toLowerCase(),
    notBefore: new Date(cert.validFrom).getTime(),
    notAfter: new Date(cert.validTo).getTime(),
  };
}

export async function validateImportedIntermediateCa(req: { certPem: string; privateKeyPem: string; parentCertPem: string }): Promise<ImportedRootCa> {
  const certPem = normalizePem(req.certPem);
  const privateKeyPem = normalizePem(req.privateKeyPem);
  const parentCertPem = normalizePem(req.parentCertPem);
  let cert: X509Certificate;
  let parentCert: X509Certificate;
  let privateKey: crypto.KeyObject;
  try {
    cert = new X509Certificate(certPem);
    parentCert = new X509Certificate(parentCertPem);
  } catch (e: any) {
    throw new Error(`CA证书解析失败：${e.message}`);
  }
  try {
    privateKey = crypto.createPrivateKey(privateKeyPem);
  } catch (e: any) {
    throw new Error(`CA私钥解析失败：${e.message}`);
  }
  if (!cert.ca) {
    throw new Error("导入的证书不是CA证书");
  }
  if (cert.verify(cert.publicKey)) {
    throw new Error("该证书是自签名根CA，请使用导入根CA");
  }
  const parentConstraints = getBasicConstraints(parentCertPem);
  if (!parentConstraints.ca) {
    throw new Error("上级证书不是CA证书");
  }
  if (parentConstraints.pathLength === 0) {
    throw new Error("上级CA pathlen=0，不能签发中间CA");
  }
  const now = Date.now();
  if (new Date(parentCert.validTo).getTime() <= now) {
    throw new Error("上级根CA已过期");
  }
  if (new Date(cert.validTo).getTime() <= now) {
    throw new Error("导入的CA证书已过期");
  }
  if (new Date(cert.validFrom).getTime() > now + 5 * 60 * 1000) {
    throw new Error("导入的CA证书尚未生效");
  }
  if (!cert.verify(parentCert.publicKey)) {
    throw new Error("中间CA证书与所选上级根CA不匹配");
  }
  const importedConstraints = getBasicConstraints(certPem);
  if (importedConstraints.pathLength !== 0) {
    throw new Error("仅支持 pathlen=0 的中间CA，避免继续签发下级CA");
  }
  if (new Date(cert.validTo).getTime() > new Date(parentCert.validTo).getTime()) {
    throw new Error("中间CA有效期不能超过上级根CA");
  }
  if (!cert.checkPrivateKey(privateKey)) {
    throw new Error("CA私钥与CA证书不匹配");
  }
  const { keyType, keySize } = keyTypeOfPrivateKey(privateKey);
  const x509Cert = new x509.X509Certificate(certPem);
  const subject = nameToSubject(x509Cert.subjectName);
  if (!subject.CN) {
    throw new Error("CA证书缺少CommonName");
  }
  const pkcs8Pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  return {
    certPem,
    privateKeyPem: normalizePem(pkcs8Pem),
    keySize,
    keyType,
    subject,
    subjectCn: subject.CN,
    fingerprintSha256: cert.fingerprint256.replaceAll(":", "").toLowerCase(),
    notBefore: new Date(cert.validFrom).getTime(),
    notAfter: new Date(cert.validTo).getTime(),
    pathLength: getBasicConstraints(certPem).pathLength ?? 0,
  };
}

export async function createCsr(req: { domains: string[]; keyType: LocalCaKeyType; usage?: LocalCaUsage }): Promise<CreateCsrResult> {
  const domains = normalizeDomains(req.domains);
  const { keys, privateKeyPem, keySize, signingAlgorithm } = await generateKeyPair(req.keyType || "rsa2048");
  const cn = domains[0].slice(0, 64);
  const csr = await x509.Pkcs10CertificateRequestGenerator.create(
    {
      name: new x509.Name([{ CN: [cn] }] as any),
      extensions: [sanExtension(domains)],
      signingAlgorithm,
      keys,
    },
    webcrypto
  );
  return {
    csrPem: normalizePem(csr.toString("pem")),
    privateKeyPem: normalizePem(privateKeyPem),
    keySize,
  };
}

export async function signCsr(req: {
  caCertPem: string;
  caPrivateKeyPem: string;
  csrPem: string;
  validityDays?: number;
  maxValidityDays?: number;
  allowedDomains?: string[];
  usage?: LocalCaUsage;
  crlDistributionPoint?: string;
}): Promise<SignCsrResult> {
  const caCertPem = normalizePem(req.caCertPem);
  const caCert = new x509.X509Certificate(caCertPem);
  const now = Date.now();
  if (caCert.notAfter.getTime() <= now) {
    throw new Error("CA证书已过期");
  }

  let csr: x509.Pkcs10CertificateRequest;
  try {
    csr = new x509.Pkcs10CertificateRequest(req.csrPem);
  } catch (e: any) {
    throw new Error(`CSR解析失败：${e.message}`);
  }
  if (!(await csr.verify(webcrypto))) {
    throw new Error("CSR签名验证失败");
  }
  const domains = readCsrDomains(csr);
  matchAllowedDomains(domains, req.allowedDomains);

  const requestedDays = Math.max(1, Math.floor(req.validityDays || 90));
  const maxDays = req.maxValidityDays && req.maxValidityDays > 0 ? req.maxValidityDays : requestedDays;
  const days = Math.min(requestedDays, maxDays);
  const notBefore = new Date(now - 5 * 60 * 1000);
  const caLimit = caCert.notAfter.getTime() - 24 * 3600 * 1000;
  const notAfter = new Date(Math.min(now + days * 24 * 3600 * 1000, caLimit));
  if (notAfter.getTime() <= notBefore.getTime()) {
    throw new Error("CA证书剩余有效期不足，无法签发");
  }

  const { signingKey, signingAlgorithm } = await importSigningKey(req.caPrivateKeyPem);
  const usage = req.usage || "server";
  const extendedKeyUsage = [x509.ExtendedKeyUsage.serverAuth];
  if (usage === "client" || usage === "both") {
    extendedKeyUsage.push(x509.ExtendedKeyUsage.clientAuth);
  }
  if (usage === "client") {
    extendedKeyUsage.splice(0, 1);
  }

  const serialNumber = randomSerialHex();
  const leafKeyAlgorithm = (csr.publicKey as any)?.algorithm?.name || "";
  const leafIsEc = /EC/i.test(leafKeyAlgorithm);
  const leafKeyUsage = x509.KeyUsageFlags.digitalSignature | (leafIsEc ? 0 : x509.KeyUsageFlags.keyEncipherment);
  const extensions: any[] = [
    new x509.BasicConstraintsExtension(false, undefined, true),
    new x509.KeyUsagesExtension(leafKeyUsage, true),
    new x509.ExtendedKeyUsageExtension(extendedKeyUsage, false),
    sanExtension(domains),
    await x509.SubjectKeyIdentifierExtension.create(csr.publicKey, false, webcrypto),
    await x509.AuthorityKeyIdentifierExtension.create(caCert.publicKey, false, webcrypto),
  ];
  if (req.crlDistributionPoint) {
    extensions.push(new x509.CRLDistributionPointsExtension([req.crlDistributionPoint]));
  }
  const cert = await x509.X509CertificateGenerator.create(
    {
      serialNumber,
      subject: csr.subjectName,
      issuer: caCert.subjectName,
      notBefore,
      notAfter,
      publicKey: csr.publicKey,
      signingKey,
      signingAlgorithm,
      extensions,
    },
    webcrypto
  );
  const certPem = normalizePem(cert.toString("pem"));
  return {
    certPem,
    chainPem: caCertPem,
    fullchainPem: `${certPem.trim()}\n${caCertPem.trim()}\n`,
    serialNumber,
    notBefore: notBefore.getTime(),
    notAfter: notAfter.getTime(),
  };
}

export async function issueLeafCertificate(req: {
  caCertPem: string;
  caPrivateKeyPem: string;
  domains: string[];
  keyType: LocalCaKeyType;
  validityDays?: number;
  maxValidityDays?: number;
  allowedDomains?: string[];
  usage?: LocalCaUsage;
  crlDistributionPoint?: string;
}): Promise<IssueLeafResult> {
  const { csrPem, privateKeyPem } = await createCsr({
    domains: req.domains,
    keyType: req.keyType,
    usage: req.usage,
  });
  const signed = await signCsr({
    caCertPem: req.caCertPem,
    caPrivateKeyPem: req.caPrivateKeyPem,
    csrPem,
    validityDays: req.validityDays,
    maxValidityDays: req.maxValidityDays,
    allowedDomains: req.allowedDomains,
    usage: req.usage,
    crlDistributionPoint: req.crlDistributionPoint,
  });
  return {
    ...signed,
    crt: signed.fullchainPem,
    key: privateKeyPem,
  };
}

export async function createCrl(req: { caCertPem: string; caPrivateKeyPem: string; entries: CrlEntryInput[]; nextUpdateDays?: number }): Promise<CrlResult> {
  const caCertPem = normalizePem(req.caCertPem);
  const caCert = new x509.X509Certificate(caCertPem);
  const { signingKey, signingAlgorithm } = await importSigningKey(req.caPrivateKeyPem);
  const thisUpdate = new Date(Date.now() - 5 * 60 * 1000);
  const nextUpdateDays = Math.max(1, Math.min(30, req.nextUpdateDays || 7));
  const nextUpdate = new Date(thisUpdate.getTime() + nextUpdateDays * 24 * 3600 * 1000);
  const crl = await x509.X509CrlGenerator.create(
    {
      issuer: caCert.subjectName,
      thisUpdate,
      nextUpdate,
      signingKey,
      signingAlgorithm,
      entries: (req.entries || []).map(entry => ({
        serialNumber: entry.serialNumber,
        revocationDate: new Date(entry.revokeTime || Date.now()),
        reason: x509.X509CrlReason.unspecified,
      })),
      extensions: [await x509.AuthorityKeyIdentifierExtension.create(caCert.publicKey, false, webcrypto), new x509.Extension("2.5.29.20", false, derInteger(Math.floor(thisUpdate.getTime() / 1000)))],
    },
    webcrypto
  );
  // @peculiar/x509 输出的 PEM 标签为 CRL，部分客户端只认标准的 X509 CRL
  const pem = crl
    .toString("pem")
    .replace(/BEGIN CRL/g, "BEGIN X509 CRL")
    .replace(/END CRL/g, "END X509 CRL");
  return {
    pem: normalizePem(pem),
    der: Buffer.from(crl.rawData),
    thisUpdate: thisUpdate.getTime(),
    nextUpdate: nextUpdate.getTime(),
  };
}

function derInteger(value: number) {
  let hex = Math.floor(value).toString(16);
  if (hex.length % 2 !== 0) {
    hex = "0" + hex;
  }
  let bytes = Buffer.from(hex, "hex");
  if (bytes[0] & 0x80) {
    bytes = Buffer.concat([Buffer.from([0]), bytes]);
  }
  return Buffer.concat([Buffer.from([0x02, bytes.length]), bytes]);
}
