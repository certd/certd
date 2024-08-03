import { createVerify } from "node:crypto";
import { logger } from "../utils/index.js";

const SecreteKey =
  "LS0tLS1CRUdJTiBSU0EgUFVCTElDIEtFWS0tLS0tCk1JSUJDZ0tDQVFFQXY3TGtMaUp1dGM0NzhTU3RaTExjajVGZXh1YjJwR2NLMGxwa0hwVnlZWjhMY29rRFhuUlAKUGQ5UlJSTVRTaGJsbFl2Mzd4QUhOV1ZIQ0ZsWHkrQklVU001bUlBU1NDQTV0azlJNmpZZ2F4bEFDQm1BY0lGMwozKzBjeGZIYVkrVW9YdVluMkZ6YUt2Ym5GdFZIZ0lkMDg4a3d4clZTZzlCT3BDRVZIR1pxR2I5TWN5MXVHVXhUClFTVENCbmpoTWZlZ0p6cXVPYWVOY0ZPSE5tbmtWRWpLTythbTBPeEhNS1lyS3ZnQnVEbzdoVnFENlBFMUd6V3AKZHdwZUV4QXZDSVJxL2pWTkdRK3FtMkRWOVNJZ3U5bmF4MktmSUtFeU50dUFFS1VpekdqL0VmRFhDM1cxMExhegpKaGNYNGw1SUFZU1o3L3JWVmpGbExWSVl0WDU1T054L1Z3SURBUUFCCi0tLS0tRU5EIFJTQSBQVUJMSUMgS0VZLS0tLS0K";
const appKey = "z4nXOeTeSnnpUpnmsV";
export type LicenseVerifyReq = {
  subjectId: string;
  license: string;
};

type License = {
  appKey: string;
  code: string;
  subjectId: string;
  expireTime: number;
  activeTime: number;
  duration: number;
  version: number;
  secret: string;
  signature: string;
};

class LicenseHolder {
  isPlus = false;
}
const holder = new LicenseHolder();
holder.isPlus = false;

class LicenseVerifier {
  checked = false;
  licenseReq?: LicenseVerifyReq = undefined;
  async reVerify(req: LicenseVerifyReq) {
    this.checked = false;
    return await this.verify(req);
  }

  setPlus(value: boolean) {
    holder.isPlus = value;
    return value;
  }
  async verify(req: LicenseVerifyReq) {
    this.licenseReq = req;
    if (this.checked) {
      return this.setPlus(false);
    }
    const license = req?.license;
    if (!license) {
      this.checked = true;
      return this.setPlus(false);
    }

    const licenseJson = Buffer.from(Buffer.from(license, "hex").toString(), "base64").toString();
    const json: License = JSON.parse(licenseJson);
    if (json.expireTime < Date.now()) {
      logger.warn("授权已过期");
      return this.setPlus(false);
    }
    const content = `${appKey},${this.licenseReq.subjectId},${json.code},${json.secret},${json.activeTime},${json.duration},${json.expireTime},${json.version}`;
    const publicKey = Buffer.from(SecreteKey, "base64").toString();
    const res = this.verifySignature(content, json.signature, publicKey);
    this.checked = true;
    if (!res) {
      logger.warn("授权校验失败");
      return this.setPlus(false);
    }
    return this.setPlus(true);
  }

  verifySignature(content: string, signature: any, publicKey: string) {
    const verify = createVerify("RSA-SHA256");
    verify.update(content);
    return verify.verify(publicKey, signature, "base64");
  }
}

const verifier = new LicenseVerifier();

export function isPlus() {
  return holder.isPlus;
}

export async function verify(req: LicenseVerifyReq) {
  return await verifier.reVerify(req);
}
