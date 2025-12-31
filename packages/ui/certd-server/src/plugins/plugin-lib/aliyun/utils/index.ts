import dayjs from "dayjs";
import { CertInfo, CertReader } from "@certd/plugin-cert";
import { AliyunSslClient } from "../lib/index.js";

export const ZoneOptions = [{ value: 'cn-hangzhou' }];
export function appendTimeSuffix(name: string) {
  if (name == null) {
    name = 'certd';
  }
  return name + '-' + dayjs().format('YYYYMMDD-HHmmss');
}

export function checkRet(ret: any) {
  if (ret.Code != null) {
    throw new Error('执行失败：' + ret.Message);
  }
}


export async function  getAliyunCertId(opts:{
  cert: string | CertInfo,
  sslClient: AliyunSslClient,
}) {
  const { cert, sslClient } = opts;
  let certId: any = cert;
  let certName: any = CertReader.appendTimeSuffix("certd");
  if (typeof cert === "object") {
    const certReader = new CertReader(cert)
    certName = certReader.buildCertName()

    certId = await sslClient.uploadCert({
      name: certName,
      cert: cert,
    });
    sslClient.logger.info("上传证书成功", certId, certName);
  }
  return {
    certId,
    certName,
  };
}
