import { CertInfo } from "./acme.js";
import fs from "fs";
import os from "os";
import path from "path";
import { crypto } from "@certd/acme-client";
import { ILogger } from "@certd/pipeline";
import dayjs from "dayjs";

export type CertReaderHandleContext = {
  reader: CertReader;
  tmpCrtPath: string;
  tmpKeyPath: string;
  tmpPfxPath?: string;
  tmpDerPath?: string;
  tmpIcPath?: string;
};
export type CertReaderHandle = (ctx: CertReaderHandleContext) => Promise<void>;
export type HandleOpts = { logger: ILogger; handle: CertReaderHandle };
export class CertReader {
  cert: CertInfo;
  crt: string;
  key: string;
  csr: string;
  ic: string; //中间证书

  detail: any;
  expires: number;
  constructor(certInfo: CertInfo) {
    this.cert = certInfo;
    this.crt = certInfo.crt;
    this.key = certInfo.key;
    this.csr = certInfo.csr;

    this.ic = certInfo.ic;
    if (!this.ic) {
      this.ic = this.getIc();
      this.cert.ic = this.ic;
    }

    const { detail, expires } = this.getCrtDetail(this.cert.crt);
    this.detail = detail;
    this.expires = expires.getTime();
  }

  getIc() {
    //中间证书ic， 就是crt的第一个 -----END CERTIFICATE----- 之后的内容
    const endStr = "-----END CERTIFICATE-----";
    const firstBlockEndIndex = this.crt.indexOf(endStr);

    const start = firstBlockEndIndex + endStr.length + 1;
    if (this.crt.length <= start) {
      return "";
    }
    const ic = this.crt.substring(start);
    return ic.trim();
  }

  toCertInfo(): CertInfo {
    return this.cert;
  }

  getCrtDetail(crt: string = this.cert.crt) {
    const detail = crypto.readCertificateInfo(crt.toString());
    const expires = detail.notAfter;
    return { detail, expires };
  }

  getAllDomains() {
    const { detail } = this.getCrtDetail();
    const domains = [detail.domains.commonName];
    domains.push(...detail.domains.altNames);
    return domains;
  }

  saveToFile(type: "crt" | "key" | "pfx" | "der" | "ic", filepath?: string) {
    if (!this.cert[type]) {
      return;
    }

    if (filepath == null) {
      //写入临时目录
      filepath = path.join(os.tmpdir(), "/certd/tmp/", Math.floor(Math.random() * 1000000) + "", `cert.${type}`);
    }

    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (type === "crt" || type === "key" || type === "ic") {
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
    logger.info("本地文件写入成功");
    const tmpDerPath = this.saveToFile("der");
    try {
      return await opts.handle({
        reader: this,
        tmpCrtPath: tmpCrtPath,
        tmpKeyPath: tmpKeyPath,
        tmpPfxPath: tmpPfxPath,
        tmpDerPath: tmpDerPath,
        tmpIcPath: tmpIcPath,
      });
    } catch (err) {
      throw err;
    } finally {
      //删除临时文件
      logger.info("删除临时文件");
      function removeFile(filepath?: string) {
        if (filepath) {
          fs.unlinkSync(filepath);
        }
      }
      removeFile(tmpCrtPath);
      removeFile(tmpKeyPath);
      removeFile(tmpPfxPath);
      removeFile(tmpDerPath);
      removeFile(tmpIcPath);
    }
  }

  buildCertFileName(suffix: string, applyTime: number, prefix = "cert") {
    const detail = this.getCrtDetail();
    let domain = detail.detail.domains.commonName;
    domain = domain.replace(".", "_").replace("*", "_");
    const timeStr = dayjs(applyTime).format("YYYYMMDDHHmmss");
    return `${prefix}_${domain}_${timeStr}.${suffix}`;
  }
}
