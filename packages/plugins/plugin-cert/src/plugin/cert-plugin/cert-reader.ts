import { CertInfo } from "./acme.js";
import fs from "fs";
import os from "os";
import path from "path";
import { crypto } from "@certd/acme-client";
export class CertReader implements CertInfo {
  crt: string;
  key: string;
  csr: string;

  detail: any;
  expires: number;
  constructor(certInfo: CertInfo) {
    this.crt = certInfo.crt;
    this.key = certInfo.key;
    this.csr = certInfo.csr;

    const { detail, expires } = this.getCrtDetail(this.crt);
    this.detail = detail;
    this.expires = expires.getTime();
  }

  toCertInfo(): CertInfo {
    return {
      crt: this.crt,
      key: this.key,
      csr: this.csr,
    };
  }

  getCrtDetail(crt: string) {
    const detail = crypto.readCertificateInfo(crt.toString());
    const expires = detail.notAfter;
    return { detail, expires };
  }

  saveToFile(type: "crt" | "key", filepath?: string) {
    if (filepath == null) {
      //写入临时目录
      filepath = path.join(os.tmpdir(), "/certd/tmp/", Math.floor(Math.random() * 1000000) + "", `cert.${type}`);
    }

    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filepath, this[type]);
    return filepath;
  }
}
