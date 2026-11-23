import { logger, safePromise, utils } from "@certd/basic";
import { merge } from "lodash-es";
import https from "https";
import { PeerCertificate } from "tls";
import { createHash, X509Certificate } from "node:crypto";
import { DnsCustom } from "./dns-custom.js";

export type SiteTestReq = {
  host: string; // 只用域名部分
  port?: number;
  method?: string;
  retryTimes?: number;
  ipAddress?: string;

  customDns?: DnsCustom;
};

export type SiteTestRes = {
  certificate?: PeerCertificate;
  chain?: PeerCertificate[];
};

export type SiteCertChainItem = {
  subject: string;
  issuer: string;
  validFrom?: number;
  validTo?: number;
  serialNumber?: string;
  fingerprintSha256?: string;
  ca?: boolean;
};

function formatCertificateName(name: Record<string, any> | null | undefined) {
  if (!name) {
    return "-";
  }
  return Object.entries(name)
    .filter(([, value]) => value != null && String(value).trim() !== "")
    .map(([key, value]) => `${key}=${value}`)
    .join(", ") || "-";
}

function certificateKey(cert: any) {
  if (cert?.fingerprint256) {
    return cert.fingerprint256;
  }
  if (cert?.fingerprint) {
    return cert.fingerprint;
  }
  if (cert?.raw) {
    return createHash("sha256").update(Buffer.from(cert.raw)).digest("hex");
  }
  return "";
}

export function collectCertificateChain(cert?: PeerCertificate | null) {
  const chain: PeerCertificate[] = [];
  const seen = new Set<string>();
  const seenObjects = new WeakSet<object>();
  let current: any = cert;
  while (current && chain.length < 10) {
    if (typeof current === "object") {
      if (seenObjects.has(current)) {
        break;
      }
      seenObjects.add(current);
    }
    const key = certificateKey(current);
    if (key && seen.has(key)) {
      break;
    }
    if (key) {
      seen.add(key);
    }
    chain.push(current);
    current = current.issuerCertificate;
  }
  return chain;
}

export function summarizeCertificateChain(chain: PeerCertificate[]) {
  return chain.map(cert => {
    let subject = formatCertificateName(cert.subject);
    let issuer = formatCertificateName(cert.issuer);
    let validFrom = Date.parse(cert.valid_from);
    let validTo = Date.parse(cert.valid_to);
    let serialNumber: string | undefined = cert.serialNumber;
    let fingerprintSha256: string | undefined = cert.fingerprint256?.replaceAll(":", "").toLowerCase();
    let ca: boolean | undefined;
    if (cert.raw) {
      try {
        const x509 = new X509Certificate(cert.raw);
        subject = x509.subject;
        issuer = x509.issuer;
        validFrom = Date.parse(x509.validFrom);
        validTo = Date.parse(x509.validTo);
        serialNumber = x509.serialNumber;
        fingerprintSha256 = x509.fingerprint256.replaceAll(":", "").toLowerCase();
        ca = x509.ca;
      } catch (e) {
        // 保留PeerCertificate回退字段
      }
    }
    return {
      subject,
      issuer,
      validFrom: Number.isFinite(validFrom) ? validFrom : undefined,
      validTo: Number.isFinite(validTo) ? validTo : undefined,
      serialNumber,
      fingerprintSha256,
      ca,
    } as SiteCertChainItem;
  });
}

export class SiteTester {
  async test(req: SiteTestReq): Promise<SiteTestRes> {
    const req_ = { ...req };
    delete req_.customDns;
    logger.info("测试站点:", JSON.stringify(req_));
    const maxRetryTimes = req.retryTimes == null ? 3 : req.retryTimes;
    let tryCount = 0;
    let result: SiteTestRes = {};
    while (true) {
      try {
        result = await this.doTestOnce(req);
        return result;
      } catch (e) {
        tryCount++;
        if (tryCount > maxRetryTimes) {
          logger.error(`测试站点出错，已超过最大重试次数（${maxRetryTimes}）`, e.message);
          throw e;
        }
        //指数退避
        const time = 2 ** tryCount;
        logger.error(`测试站点出错，${time}s后重试(${tryCount}/${maxRetryTimes})`, e);
        await utils.sleep(time * 1000);
      }
    }
  }

  async doTestOnce(req: SiteTestReq): Promise<SiteTestRes> {
    const options: any = merge(
      {
        port: 443,
        method: "GET",
        rejectUnauthorized: false,
      },
      req
    );

    let customLookup = null;
    if (req.ipAddress) {
      //使用固定的ip
      const ipAddress = req.ipAddress;
      options.headers = {
        host: options.host,
        //sni
        servername: options.host,
      };
      options.host = ipAddress;
    } else if (req.customDns) {
      // 非ip address 请求时
      const customDns = req.customDns;
      customLookup = async (hostname: string, options: any, callback) => {
        console.log(hostname, options);

        // { family: undefined, hints: 0, all: true }
        const res = await customDns.lookup(hostname, options);
        console.log("custom lookup res:", res);
        if (!res || res.length === 0) {
          callback(new Error("没有解析到IP"));
        }
        callback(null, res);
      };
    }

    const agentOptions: any = { keepAlive: false };
    if (customLookup) {
      agentOptions.lookup = customLookup;
    }
    options.agent = new https.Agent(agentOptions);

    // 创建 HTTPS 请求
    const requestPromise = safePromise((resolve, reject) => {
      const req = https.request(options, res => {
        res.socket.end();
        // 关闭响应
        res.destroy();
      });

      // ✅ 关键：在 'socket' 事件中获取证书（握手完成后立即执行）
      req.on("socket", (socket: any) => {
        socket.on("secureConnect", () => {
          // TLS握手完成，证书已经可用
          const certificate = socket.getPeerCertificate(true);
          if (certificate.subject) {
            const chain = collectCertificateChain(certificate);
            logger.info("证书获取成功", certificate.subject, `chain=${chain.length}`);
            resolve({
              certificate,
              chain,
            });
          } else {
            logger.warn("证书信息为空");
            resolve({
              certificate: null,
            });
          }
        });
      });

      req.on("error", e => {
        reject(e);
      });
      req.end();
    });

    return await requestPromise;
  }
}

export const siteTester = new SiteTester();
