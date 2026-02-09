import { ILogger, utils } from "@certd/basic";
import { AliyunAccess } from "../access/index.js";
import { AliyunClient } from "./index.js";
import { CertInfo, CertReader } from "@certd/plugin-lib";

export type AliyunCertInfo = {
  crt: string; //fullchain证书
  key: string; //私钥
};
export type AliyunSslClientOpts = {
  access: AliyunAccess;
  logger: ILogger;
  endpoint?: string;
  region?: string;
};

export type AliyunSslGetResourceListReq = {
  cloudProduct: string;
};

export type AliyunSslCreateDeploymentJobReq = {
  name: string;
  jobType: string;
  contactIds: string[];
  resourceIds: string[];
  certIds: string[];
};

export type AliyunSslUploadCertReq = {
  name: string;
  cert: AliyunCertInfo;
};

export type CasCertInfo = { certId: number; certName: string; certIdentifier: string; notAfter: number; casRegion: string };

export type CasCertId = {
  certId: number;
  certIdentifier: string;
  certName: string;
}
export class AliyunSslClient {
  opts: AliyunSslClientOpts;
  logger: ILogger;
  constructor(opts: AliyunSslClientOpts) {
    this.opts = opts;
    this.logger = opts.logger;
  }

  checkRet(ret: any) {
    if (ret.Code != null) {
      throw new Error("执行失败：" + ret.Message);
    }
  }

  async getClient() {
    const access = this.opts.access;
    const client = new AliyunClient({ logger: this.opts.logger });

    let endpoint = this.opts.endpoint || "cas.aliyuncs.com";
    if (this.opts.endpoint == null && this.opts.region) {
      if (this.opts.region === "cn-hangzhou") {
        endpoint = "cas.aliyuncs.com";
      } else {
        endpoint = `cas.${this.opts.region}.aliyuncs.com`;
      }
    }
    await client.init({
      accessKeyId: access.accessKeyId,
      accessKeySecret: access.accessKeySecret,
      endpoint: `https://${endpoint}`,
      apiVersion: "2020-04-07",
    });
    return client;
  }

  async getCertInfo(certId: number): Promise<CasCertInfo> {
    const client = await this.getClient();
    const params = {
      CertId: certId,
    };

    const res = await client.request("GetUserCertificateDetail", params);
    this.checkRet(res);

    return {
      certId: certId,
      certName: res.Name,
      certIdentifier: res.CertIdentifier,
      notAfter: res.NotAfter,
      casRegion: this.getCasRegionFromEndpoint(this.opts.endpoint),
    };
  }

  getCertIdentifier(certId: number | string) {
    if (typeof certId === "string" && certId.indexOf("-") > 0) {
      return certId;
    }
    return `${certId}-${this.getCasRegionFromEndpoint(this.opts.endpoint)}`;
  }

  async uploadCert(req: AliyunSslUploadCertReq) {
      const {certId} = await this.uploadCertificate(req);
      return certId;
  }
  async uploadCertificate(req: AliyunSslUploadCertReq) : Promise<CasCertId> {
    const client = await this.getClient();
    const params = {
      Name: req.name,
      Cert: req.cert.crt,
      Key: req.cert.key,
    };

    const requestOption = {
      method: "POST",
    };

    this.opts.logger.info(`开始上传证书：${req.name}`);
    const ret: any = await client.request("UploadUserCertificate", params, requestOption);
    this.checkRet(ret);
    this.opts.logger.info("证书上传成功：aliyunCertId=", ret.CertId);
    //output
    return {
      certId: ret.CertId,
      certName: req.name,
      certIdentifier: this.getCertIdentifier(ret.CertId),
    }
  }

  async uploadCertOrGet(cert: CertInfo | number | CasCertId )  :Promise<CasCertId>{
    if (typeof cert === "object") {

      const casCert = cert as CasCertId;
      if (casCert.certId) {
        return casCert;
      }
      const certInfo = cert as CertInfo;
      // 上传证书到阿里云
      this.logger.info(`开始上传证书`);
      const certName = CertReader.buildCertName(certInfo);
      const res = await this.uploadCertificate({
        name: certName,
        cert: certInfo
      });
      this.logger.info("上传证书成功", JSON.stringify(res));
      return res
    }
    //number类型
    const certId = cert as any;
    let certName: any = utils.string.appendTimeSuffix(certId);
    const certIdentifier = this.getCertIdentifier(certId);
    return {
      certId,
      certIdentifier,
      certName
    }
  }

  async getResourceList(req: AliyunSslGetResourceListReq) {
    const client = await this.getClient();
    const params = {
      CloudName: "aliyun",
      CloudProduct: req.cloudProduct,
    };

    const requestOption = {
      method: "POST",
      formatParams: false,
    };

    const res = await client.request("ListCloudResources", params, requestOption);
    this.checkRet(res);
    return res;
  }

  async createDeploymentJob(req: AliyunSslCreateDeploymentJobReq) {
    const client = await this.getClient();

    const params = {
      Name: req.name,
      JobType: req.jobType,
      ContactIds: req.contactIds.join(","),
      ResourceIds: req.resourceIds.join(","),
      CertIds: req.certIds.join(","),
    };

    const requestOption = {
      method: "POST",
      formatParams: false,
    };

    const res = await client.request("CreateDeploymentJob", params, requestOption);
    this.checkRet(res);
    return res;
  }

  async getContactList() {
    const params = {};

    const requestOption = {
      method: "POST",
      formatParams: false,
    };
    const client = await this.getClient();
    const res = await client.request("ListContact", params, requestOption);
    this.checkRet(res);
    return res;
  }

  async doRequest(action: string, params: any, requestOption: any) {
    const client = await this.getClient();
    const res = await client.request(action, params, requestOption);
    this.checkRet(res);
    return res;
  }

  async deleteCert(certId: any) {
    await this.doRequest("DeleteUserCertificate", { CertId: certId }, { method: "POST" });
  }

  getCasRegionFromEndpoint(endpoint: string) {
    if (!endpoint) {
      return "cn-hangzhou";
    }
    /**
     * {value: 'cas.aliyuncs.com', label: '中国大陆'},
     *         {value: 'cas.ap-southeast-1.aliyuncs.com', label: '新加坡'},
     *         {value: 'cas.eu-central-1.aliyuncs.com', label: '德国（法兰克福）'},
     */
    const region = endpoint.replace(".aliyuncs.com", "").replace("cas.", "");
    if (region === "cas") {
      return "cn-hangzhou";
    }
    return region;
  }
}
