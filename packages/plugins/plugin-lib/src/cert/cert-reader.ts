import fs from "fs";
import os from "os";
import path from "path";
import { CertificateInfo, crypto } from "@certd/acme-client";
import cryptoLib from "crypto";
import { ILogger } from "@certd/basic";
import dayjs from "dayjs";
import { uniq } from "lodash-es";

export interface ICertInfoGetter {
  getByPipelineId: (pipelineId: number) => Promise<CertInfo>;
}
export type CertInfo = {
  crt: string; //fullchain证书
  key: string; //私钥
  csr: string; //csr
  oc?: string; //仅证书，非fullchain证书
  ic?: string; //中间证书
  pfx?: string;
  der?: string;
  jks?: string;
  one?: string;
  p7b?: string;
};

export type CertReaderHandleContext = {
  reader: CertReader;
  tmpCrtPath: string;
  tmpKeyPath: string;
  tmpOcPath?: string;
  tmpPfxPath?: string;
  tmpDerPath?: string;
  tmpIcPath?: string;
  tmpJksPath?: string;
  tmpOnePath?: string;
  tmpP7bPath?: string;
};
export type CertReaderHandle = (ctx: CertReaderHandleContext) => Promise<void>;
export type HandleOpts = { logger: ILogger; handle: CertReaderHandle };

const formats = {
  pem: ["crt", "key", "ic"],
  one: ["one"],
  pfx: ["pfx"],
  der: ["der"],
  jks: ["jks"],
  p7b: ["p7b", "key"],
};

export type SimpleCertDetail = {
  notBefore: Date;
  notAfter: Date;
  domains: string[];
};
export class CertReader {
  cert: CertInfo;

  detail: CertificateInfo;
  //毫秒时间戳
  effective: number;
  //毫秒时间戳
  expires: number;
  constructor(certInfo: CertInfo) {
    this.cert = certInfo;

    if (!certInfo.ic) {
      this.cert.ic = this.getIc();
    }

    if (!certInfo.oc) {
      this.cert.oc = this.getOc();
    }

    if (!certInfo.one) {
      this.cert.one = this.cert.crt + "\n" + this.cert.key;
    }

    try {
      const { detail, effective, expires } = this.getCrtDetail(this.cert.crt);
      this.detail = detail;
      this.effective = effective.getTime();
      this.expires = expires.getTime();
    } catch (e) {
      throw new Error("证书解析失败:" + e.message);
    }
  }

  getIc() {
    //中间证书ic， 就是crt的第一个 -----END CERTIFICATE----- 之后的内容
    const endStr = "-----END CERTIFICATE-----";
    const firstBlockEndIndex = this.cert.crt.indexOf(endStr);

    const start = firstBlockEndIndex + endStr.length + 1;
    if (this.cert.crt.length <= start) {
      return "";
    }
    const ic = this.cert.crt.substring(start);
    if (ic == null) {
      return "";
    }
    return ic?.trim();
  }

  getOc() {
    //原始证书 就是crt的第一个 -----END CERTIFICATE----- 之前的内容
    const endStr = "-----END CERTIFICATE-----";
    const arr = this.cert.crt.split(endStr);
    return arr[0] + endStr;
  }

  toCertInfo(format?: string): CertInfo {
    if (!format) {
      return this.cert;
    }

    const formatArr = formats[format];
    const res: any = {};
    formatArr.forEach((key: string) => {
      res[key] = this.cert[key];
    });
    return res;
  }

  getCrtDetail(crt: string = this.cert.crt) {
    return CertReader.readCertDetail(crt);
  }

  getSimpleDetail() {
    const { detail } = this.getCrtDetail();
    return {
      notBefore: detail.notBefore,
      notAfter: detail.notAfter,
      domains: this.getAllDomains(),
    };
  }

  static readCertDetail(crt: string) {
    const detail = crypto.readCertificateInfo(crt.toString());
    const effective = detail.notBefore;
    const expires = detail.notAfter;
    const fingerprints = CertReader.getFingerprintX509(crt);
    // @ts-ignore
    detail.fingerprints = fingerprints;
    return { detail, effective, expires };
  }

  static getFingerprintX509(crt: string) {
    try {
      // 创建X509Certificate实例
      const cert = new cryptoLib.X509Certificate(crt);
      // 获取指纹
      return {
        fingerprint: cert.fingerprint,
        fingerprint256: cert.fingerprint256,
        fingerprint512: cert.fingerprint512,
      };
    } catch (error) {
      console.error("处理证书失败:", error.message);
      return null;
    }
  }

  getAllDomains() {
    const { detail } = this.getCrtDetail();
    const domains = [];
    if (detail.domains?.commonName) {
      domains.push(detail.domains.commonName);
    }
    domains.push(...detail.domains.altNames);
    //去重
    return uniq(domains);
  }

  getAltNames() {
    const { detail } = this.getCrtDetail();
    return detail.domains.altNames;
  }

  static getMainDomain(crt: string) {
    const { detail } = CertReader.readCertDetail(crt);
    return CertReader.getMainDomainFromDetail(detail);
  }

  getMainDomain() {
    const { detail } = this.getCrtDetail();
    return CertReader.getMainDomainFromDetail(detail);
  }

  static getMainDomainFromDetail(detail: CertificateInfo) {
    let domain = detail?.domains?.commonName;
    if (domain == null) {
      domain = detail?.domains?.altNames?.[0];
    }
    if (domain == null) {
      domain = "unknown";
    }
    return domain;
  }

  saveToFile(type: "crt" | "key" | "pfx" | "der" | "oc" | "one" | "ic" | "jks" | "p7b", filepath?: string) {
    if (!this.cert[type]) {
      return;
    }

    if (filepath == null) {
      //写入临时目录
      filepath = path.join(os.tmpdir(), "/certd/tmp/", Math.floor(Math.random() * 1000000) + `_cert.${type}`);
    }

    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (type === "crt" || type === "key" || type === "ic" || type === "oc" || type === "one" || type === "p7b") {
      fs.writeFileSync(filepath, this.cert[type]);
    } else {
      fs.writeFileSync(filepath, Buffer.from(this.cert[type], "base64"));
    }
    return filepath;
  }

  async readCertFile(opts: HandleOpts) {
    const logger = opts.logger;
    logger.info("将证书写入本地缓存文件");
    const tmpCrtPath = this.saveToFile("crt");
    const tmpKeyPath = this.saveToFile("key");
    const tmpPfxPath = this.saveToFile("pfx");
    const tmpIcPath = this.saveToFile("ic");
    const tmpOcPath = this.saveToFile("oc");
    const tmpDerPath = this.saveToFile("der");
    const tmpJksPath = this.saveToFile("jks");
    const tmpOnePath = this.saveToFile("one");
    const tmpP7bPath = this.saveToFile("p7b");
    logger.info("本地文件写入成功");
    try {
      return await opts.handle({
        reader: this,
        tmpCrtPath,
        tmpKeyPath,
        tmpPfxPath,
        tmpDerPath,
        tmpIcPath,
        tmpJksPath,
        tmpOcPath,
        tmpP7bPath,
        tmpOnePath,
      });
    } catch (err) {
      logger.error("处理失败", err);
      throw err;
    } finally {
      //删除临时文件
      logger.info("清理临时文件");
      function removeFile(filepath?: string) {
        if (filepath) {
          fs.unlinkSync(filepath);
        }
      }
      removeFile(tmpCrtPath);
      removeFile(tmpKeyPath);
      removeFile(tmpPfxPath);
      removeFile(tmpOcPath);
      removeFile(tmpDerPath);
      removeFile(tmpIcPath);
      removeFile(tmpJksPath);
      removeFile(tmpOnePath);
      removeFile(tmpP7bPath);
    }
  }

  buildCertFileName(suffix: string, applyTime: any, prefix = "cert") {
    let domain = this.getMainDomain();
    domain = domain.replaceAll(".", "_").replaceAll("*", "_");
    const timeStr = dayjs(applyTime).format("YYYYMMDDHHmmss");
    return `${prefix}_${domain}_${timeStr}.${suffix}`;
  }

  buildCertName(prefix: string = "") {
    let domain = this.getMainDomain();
    domain = domain.replaceAll(".", "_").replaceAll("*", "_");
    return `${prefix}_${domain}_${dayjs().format("YYYYMMDDHHmmssSSS")}`;
  }

  static appendTimeSuffix(name?: string) {
    if (name == null) {
      name = "certd";
    }
    return name + "_" + dayjs().format("YYYYMMDDHHmmssSSS");
  }

  static buildCertName(cert: CertInfo) {
    return new CertReader(cert).buildCertName();
  }
}
