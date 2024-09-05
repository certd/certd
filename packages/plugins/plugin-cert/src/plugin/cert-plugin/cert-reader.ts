import { CertInfo } from "./acme.js";
import fs from "fs";
import os from "os";
import path from "path";
import { crypto } from "@certd/acme-client";
import { ILogger } from "@certd/pipeline";
import dayjs from "dayjs";

export type CertReaderHandleContext = { reader: CertReader; tmpCrtPath: string; tmpKeyPath: string; tmpPfxPath?: string; tmpDerPath?: string };
export type CertReaderHandle = (ctx: CertReaderHandleContext) => Promise<void>;
export type HandleOpts = { logger: ILogger; handle: CertReaderHandle };
export class CertReader {
  cert: CertInfo;
  crt: string;
  key: string;
  csr: string;

  detail: any;
  expires: number;
  constructor(certInfo: CertInfo) {
    this.cert = certInfo;
    this.crt = certInfo.crt;
    this.key = certInfo.key;
    this.csr = certInfo.csr;

    const { detail, expires } = this.getCrtDetail(this.cert.crt);
    this.detail = detail;
    this.expires = expires.getTime();
  }

  toCertInfo(): CertInfo {
    return this.cert;
  }

  getCrtDetail(crt: string = this.cert.crt) {
    const detail = crypto.readCertificateInfo(crt.toString());
    const expires = detail.notAfter;
    return { detail, expires };
  }

  saveToFile(type: "crt" | "key" | "pfx" | "der", filepath?: string) {
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
    if (type === "crt" || type === "key") {
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
    const tmpDerPath = this.saveToFile("der");
    logger.info("本地文件写入成功");
    try {
      await opts.handle({
        reader: this,
        tmpCrtPath: tmpCrtPath,
        tmpKeyPath: tmpKeyPath,
        tmpPfxPath: tmpPfxPath,
        tmpDerPath: tmpDerPath,
      });
    } finally {
      //删除临时文件
      logger.info("删除临时文件");
      fs.unlinkSync(tmpCrtPath);
      fs.unlinkSync(tmpKeyPath);
      fs.unlinkSync(tmpPfxPath);
      fs.unlinkSync(tmpDerPath);
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
