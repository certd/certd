const crypto = require("crypto");

class CertdClient {
  constructor(keyId, keySecret, options = {}) {
    if (!keyId) {
      throw new Error("keyId is required");
    }
    if (!keySecret) {
      throw new Error("keySecret is required");
    }
    this.keyId = keyId;
    this.keySecret = keySecret;
    this.baseUrl = (options.baseUrl || "http://127.0.0.1:7001").replace(/\/$/, "");
    this.encrypt = options.encrypt === true;
    this.signType = options.signType || "md5";
  }

  getSign(content) {
    if (this.signType !== "md5") {
      throw new Error(`Unsupported signType: ${this.signType}`);
    }
    return crypto.createHash("md5").update(content + this.keySecret, "utf8").digest("hex");
  }

  getToken(options = {}) {
    const encrypt = options.encrypt ?? this.encrypt;
    const content = JSON.stringify({
      keyId: this.keyId,
      t: Math.floor(Date.now() / 1000),
      encrypt,
      signType: this.signType,
    });
    const sign = this.getSign(content);
    return `${Buffer.from(content, "utf8").toString("base64")}.${Buffer.from(sign, "utf8").toString("base64")}`;
  }

  async request(path, body = {}, options = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: options.method || "POST",
      headers: {
        "content-type": "application/json",
        "x-certd-token": this.getToken({ encrypt: options.encrypt }),
        ...(options.headers || {}),
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${text}`);
    }
    return text;
  }

  getCert(params) {
    return this.request("/api/v1/cert/get", params);
  }
}

module.exports = { CertdClient };
