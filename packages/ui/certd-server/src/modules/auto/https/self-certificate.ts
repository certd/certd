import { logger } from "@certd/basic";
import fs from "fs";
// @ts-ignore
import forge from "node-forge";
import path from "path";

export function createSelfCertificate(opts: { crtPath: string; keyPath: string }) {
  // 生成密钥对
  const keypair = forge.pki.rsa.generateKeyPair(2048);

  // 创建自签名证书
  const cert = forge.pki.createCertificate();
  cert.publicKey = keypair.publicKey;
  cert.serialNumber = "01";
  cert.validFrom = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(); // 1天前
  cert.validTo = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 10).toISOString(); // 10年后
  // 创建主题
  const attrs = [
    {
      name: "commonName",
      value: "self-certificate.certd", // 或者你的域名
    },
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keypair.privateKey, forge.md.sha256.create());

  // 导出证书和私钥
  const pemCert = forge.pki.certificateToPem(cert);
  const pemKey = forge.pki.privateKeyToPem(keypair.privateKey);

  // 写入文件
  logger.info("生成自签名证书成功");
  logger.info(`自签证书保存路径: ${opts.crtPath}`);
  logger.info(`自签私钥保存路径: ${opts.keyPath}`);
  const crtDir = path.dirname(opts.crtPath);
  if (!fs.existsSync(crtDir)) {
    fs.mkdirSync(crtDir, { recursive: true });
  }
  const keyDir = path.dirname(opts.keyPath);
  if (!fs.existsSync(keyDir)) {
    fs.mkdirSync(keyDir, { recursive: true });
  }
  fs.writeFileSync(opts.crtPath, pemCert);
  fs.writeFileSync(opts.keyPath, pemKey);

  return {
    crtPath: opts.crtPath,
    keyPath: opts.keyPath,
    crt: pemCert,
    key: pemKey,
  };
}
