import { HttpClient } from '@certd/pipeline';
import { QiniuAccess } from '../../access/index.js';
import { CertInfo } from '@certd/plugin-cert';

export async function doRequest(http: HttpClient, access: QiniuAccess, url: string, method: string, body: any) {
  const { generateAccessToken } = await import('qiniu/qiniu/util.js');
  const token = generateAccessToken(access, url);
  const res = await http.request({
    url,
    method: method,
    headers: {
      Authorization: token,
    },
    data: body,
  });

  if (res.code !== 200 || res.error) {
    throw new Error('请求失败：' + res.error);
  }
  return res;
}

export async function uploadCert(http: HttpClient, access: QiniuAccess, cert: CertInfo, certName?: string) {
  const url = 'https://api.qiniu.com/sslcert';

  const body = {
    name: certName,
    common_name: 'certd',
    pri: cert.key,
    ca: cert.crt,
  };

  const res = await doRequest(http, access, url, 'post', body);

  return res.certID;
}
