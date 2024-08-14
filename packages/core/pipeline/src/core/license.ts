import { createVerify } from "node:crypto";
import { logger } from "../utils/index.js";

const SecreteKey =
  "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUlJQkNnS0NBUUVBMjdoZDM0NjRYbyt3TkpmTTNCWjE5MXlQK2NLaTd3ck9CbXdjTWJPZUdsNlJOMUVtTGhyMgplOFdvOGpmMW9IVXc5RFV6L2I2ZHU3Q3ZXMXZNUDA1Q3dSS3lNd2U3Q1BYRGQ2U01mSkwxRFZyUkw5Ylh0cEYzCjJkQVA5UENrakFJcFMvRE5jVkhLRXk1QW8yMnFFenpTKzlUT0JVY2srREdZcmo4KzI5U3h2aEZDRE5ZbEE2d1EKbEkyRWc5TWNBV2xDU3p1S1JWa2ZWUWdYVlU3SmE5OXp1Um1oWWtYZjFxQzBLcVAwQkpDakdDNEV6ZHorMmwyaAo2T3RxVHVVLzRkemlYYnRMUS8vU0JqNEgxdi9PZ3dUZjJkSVBjUnRHOXlWVTB2ZlQzVzdUTkdlMjU3em5ESDBYCkd6Wm4zdWJxTXJuL084b2ltMHRrS3ZHZXZ1V2ZraWNwVVFJREFRQUIKLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0tCg==";
export const appKey = "GGtrKRWRknFdIID0rW";
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
  level: number;
  signature: string;
};

class LicenseHolder {
  isPlus = false;
  expireTime = 0;
  level = 1;
  message?: string = undefined;
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

  setPlus(value: boolean, info: any = {}) {
    if (value && !info) {
      holder.isPlus = true;
      holder.expireTime = info.expireTime;
      holder.level = info.level;
    } else {
      holder.isPlus = false;
      holder.expireTime = 0;
      holder.level = 1;
      holder.message = info.message;
    }
    return {
      ...holder,
    };
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
      return this.setPlus(false, { message: "授权已过期" });
    }
    const content = `${appKey},${this.licenseReq.subjectId},${json.code},${json.secret},${json.activeTime},${json.duration},${json.expireTime},${json.version}`;
    const publicKey = Buffer.from(SecreteKey, "base64").toString();
    const res = this.verifySignature(content, json.signature, publicKey);
    this.checked = true;
    if (!res) {
      logger.warn("授权校验失败");
      return this.setPlus(false, { message: "授权校验失败" });
    }
    return this.setPlus(true, {
      expireTime: json.expireTime,
      level: json.level || 1,
    });
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

export function getPlusInfo() {
  return {
    isPlus: holder.isPlus,
    level: holder.level,
    expireTime: holder.expireTime,
  };
}

export async function verify(req: LicenseVerifyReq) {
  return await verifier.reVerify(req);
}
