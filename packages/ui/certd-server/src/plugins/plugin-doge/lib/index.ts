import crypto from 'crypto';
import querystring from 'querystring';
import { DogeCloudAccess } from '../access.js';
import { AxiosInstance } from 'axios';

export class DogeClient {
  accessKey: string;
  secretKey: string;
  http: AxiosInstance;
  constructor(access: DogeCloudAccess, http: AxiosInstance) {
    this.accessKey = access.accessKey;
    this.secretKey = access.secretKey;
    this.http = http;
  }

  async request(apiPath: string, data: any = {}, jsonMode = false) {
    // 这里替换为你的多吉云永久 AccessKey 和 SecretKey，可在用户中心 - 密钥管理中查看
    // 请勿在客户端暴露 AccessKey 和 SecretKey，那样恶意用户将获得账号完全控制权

    const body = jsonMode ? JSON.stringify(data) : querystring.encode(data);
    const sign = crypto
      .createHmac('sha1', this.secretKey)
      .update(Buffer.from(apiPath + '\n' + body, 'utf8'))
      .digest('hex');
    const authorization = 'TOKEN ' + this.accessKey + ':' + sign;
    const res: any = await this.http.request({
      url: 'https://api.dogecloud.com' + apiPath,
      method: 'POST',
      data: body,
      responseType: 'json',
      headers: {
        'Content-Type': jsonMode ? 'application/json' : 'application/x-www-form-urlencoded',
        Authorization: authorization,
      },
    });

    if (res.code !== 200) {
      throw new Error('API Error: ' + res.msg);
    }
    return res.data;
  }
}
