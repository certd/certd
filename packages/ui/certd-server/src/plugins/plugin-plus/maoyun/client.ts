import { HttpClient, HttpRequestConfig, ILogger } from "@certd/basic";
import { MaoyunAccess } from "./access.js";

export class MaoyunClient {
  privateKeyPem = "";
  http: HttpClient;
  logger: ILogger;
  access: MaoyunAccess;
  token: string;

  constructor(opts: { logger: ILogger; http: HttpClient; access: MaoyunAccess }) {
    this.logger = opts.logger;
    this.http = opts.http;
    this.access = opts.access;
    this.privateKeyPem =
      "\n-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEAt83xKlUSU0i09/pwwQ0MQQ0v71IULdVGJ3AFo+anwLX1TRCp\nxmY5i+xmT9tshHqiPGN8qeg+lDaqA+iwmS6zqi+KlNmmKJc3kUx/h24MI3nff0xy\nz605ZfDgJhwBkJpTI6Sk4+OLX+lZxOiET0nOT7jrhKiFCKX8+0ZXjTJ1cmdifKaj\nqXmjD+XYZzBwA2fCr1kPq2xKvU097Ksu6QvM+La5X/tt+FJOuedmuqZmsb6YQ+6O\n6mJ0bcY0kFDGNkoeY6dEyeJAkIDJbda3n0I71KwRR2J0CSN3TF+w1hSQa7Hp1rXw\n+zQvR6p7O2VY8zQeZZKRKGl7OGdKW5F79iz2fQIDAQABAoIBAEN0BaRGciI0VY2H\n0CdY1X1uDIBke9lSIpvIhZlfxYJ4hFxS2CtiSo4qJGX8HbgElVNaI17rR0P3R6+F\njoG43OCA7/euZEcTL6ZYD5kw7q16RWYfNSc36A+cNXZm4sAhko9LFeQ4FmcNaQ9V\nUXEToe4p6+zUN3Y0DEJezzSXJvjjjodT5L03i2HCW+/xZIHi6oh1DuXdy7h1Ah8s\nSxN188HsX7/SoDHAxDqi/SSGyoYg/SvtOetPtrcZCfqoHfxkR+jQHNaOTq3vGmsu\np8KPtRBoFvSPMxSSHNLb4qbIFvlWRLNXfIhYnenTPtmCnnqogotZZ9CoCHL9dX5R\nt4q5L6ECgYEA5jYhqpRIhqSZOTJopGgy3LBy5T1PHDTfedTuSxnoywYWCuGNwgjI\nRgd94jcUuizO9euobxvDUTdOZ6LdK1NStfwOspb2NojvlE+9SfC8JDv7ZeRz8egB\nClrT6jtCUr80K1I0eF31ha0YMjgi7WZJvTMp53fqI0b1yQO2FaBNgWUCgYEAzGT6\nay+QlO2Fdt9mqeIJy9QiugItC7lk75fQMg5fa8A8wj9DO86o/2k4rKhl7SPg0H+R\nSJQoZGuS4M2f9muEHnLmVF8EzizuHZoR3HO4mie2adVf9NfAmkFsCluRAZKtQkNc\nt/VwlJEC6dChoZkU8Wzd0fSJKrdhjik2ayGXmzkCgYEAuie9s5UyzIXfTSwhCAkm\nT+TzE8Iu7Y0nxPnVM6+g2kNyoZvgqK23XUGDnuCRhzbiqGPGkQovN8Z0RUOiev1m\n3bgUHoAKWvECYrjURS1AxkAmuy8wPsYvyTLHOBpxOD5bLkjMGyVHe7AL59gTDktv\nh2oPEZibIamo6MJyhCxbYC0CgYAIZhnYL7MsO3phgRqR3oTyiDwJEq/RLIQWSFG4\nzNhk8BhPDxRvL7XIEQXQKndNwEyrpKJOri/euIDnlet9z7s1GRmX2/OxmS0LsFoN\nif/K7djUDn2L7RWwAQI0hsC1pNZTw7raoE5I/JB3FSifIFA4/3U5/GdqhvCOS+k9\ni7rUGQKBgQDPspapfGj2ozgWChJ2xMTGBhJhynM81w3j9w7MLvO/7/U43zYzKzyc\n7YJzApQOSwX/nLdquzi+UIbvuCB3npZVZl52S4f7BBcgLNQpdmcfWrAbDv5lySfn\n/KTN22Wxmhh20QgiNSxj+o+KIgdAgZCgWt7NrkZ5UX7Lo+ZfYU1xbg==\n-----END RSA PRIVATE KEY-----";
  }

  async sign(data: string) {
    const { KJUR, KEYUTIL, hextob64 } = await import("jsrsasign");
    const privateKey = KEYUTIL.getKey(this.privateKeyPem);
    // 创建签名实例
    const signature = new KJUR.crypto.Signature({
      alg: "SHA256withRSA",
    });

    // 初始化私钥
    signature.init(privateKey);

    // 更新待签名数据（假设原文是字符串）
    signature.updateString(data);

    // 生成签名（默认返回十六进制字符串）
    const hexSignature = signature.sign();

    // 转换为 Base64（假设 Ix 是 Base64 编码）
    return hextob64(hexSignature);
  }

  async doRequest(req: HttpRequestConfig) {
    const timestamp = Date.now();

    let data = "";
    if (req.method.toLowerCase() === "get") {
      // area_codes=&channel_type=0,1,2&domain_name=&https_status=&nonce=1747242446238&order=&page=1&page_size=10&status=&timestamp=1747242446238
      let queryList = [];
      for (const key in req.params) {
        queryList.push(`${key}=${req.params[key]}`);
      }
      queryList.push(`nonce=${timestamp}`);
      queryList.push(`timestamp=${timestamp}`);
      //sort
      queryList = queryList.sort();
      data = queryList.join("&");
    } else {
      data = `body=${JSON.stringify(req.data || {})}&nonce=${timestamp}&timestamp=${timestamp}`;
    }
    const sign = await this.sign(data);
    const headers: any = {
      sign: sign,
      timestamp: timestamp,
      nonce: timestamp,
    };

    if (this.token) {
      headers.Token = this.token;
    }

    const res = await this.http.request({
      ...req,
      headers,
      baseURL: "https://testaa.5678.jp",
    });

    if (!res.success && res.code !== 200) {
      throw new Error(`请求失败：${res.msg}`);
    }
    return res.data;
  }

  async login() {
    const req = {
      email: this.access.username,
      password: this.access.password,
      accountType: 1,
    };
    const res = await this.doRequest({
      url: "/api/vcloud/v1/userApi/noAuth/login",
      method: "post",
      data: req,
      logRes: false,
      logParams: false,
    });
    const { token } = res;
    this.logger.info(`登录成功`);
    this.token = token;
  }
}
