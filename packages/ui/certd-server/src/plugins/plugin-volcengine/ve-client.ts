import { VolcengineAccess } from "./access.js";
import { HttpClient, ILogger } from "@certd/basic";

export type VolcengineOpts = {
  access: VolcengineAccess
  logger: ILogger
  http: HttpClient
}

export class VolcengineClient {
  opts: VolcengineOpts;
  CommonService: any;

  constructor(opts: VolcengineOpts) {
    this.opts = opts;
  }

  async getCertCenterService() {
    const CommonService = await this.getServiceCls();

    const service = new CommonService({
      serviceName: "certificate_service",
      defaultVersion: "2024-10-01"
    });
    service.setAccessKeyId(this.opts.access.accessKeyId);
    service.setSecretKey(this.opts.access.secretAccessKey);
    service.setRegion("cn-beijing");

    service.ImportCertificate = async (body: { certName: string, cert: any }) => {
      const { certName, cert } = body;
      const res = await service.request({
        action: "ImportCertificate",
        method: "POST",
        body: {
          Tag: certName,
          Repeatable: false,
          CertificateInfo: {
            CertificateChain: cert.crt,
            PrivateKey: cert.key
          }
        }
      });
      return res.Result.InstanceId || res.Result.RepeatId;
    };

    service.GetCertificateDetail = async (certificateId: string) => {
      const res = await service.request({
        action: "CertificateGetInstance",
        method: "POST",
        body: {
          InstanceId: certificateId
        }
      });
      return res.Result;
    };
    return service;
  }

  async getClbService(opts: { region?: string }) {
    const CommonService = await this.getServiceCls();

    const service = new CommonService({
      serviceName: "clb",
      defaultVersion: "2020-04-01"
    });
    service.setAccessKeyId(this.opts.access.accessKeyId);
    service.setSecretKey(this.opts.access.secretAccessKey);
    service.setRegion(opts.region);

    return service;
  }

  async getLiveService() {
    const CommonService = await this.getServiceCls();

    const service = new CommonService({
      serviceName: "live",
      defaultVersion: "2023-01-01"
    });
    service.setAccessKeyId(this.opts.access.accessKeyId);
    service.setSecretKey(this.opts.access.secretAccessKey);
    service.setRegion("cn-north-1");

    return service;
  }

  async getVodService(opts?: { version?: string, region?: string }) {
    const CommonService = await this.getServiceCls();

    const service = new CommonService({
      serviceName: "vod",
      defaultVersion: opts?.version || "2021-01-01"
    });
    service.setAccessKeyId(this.opts.access.accessKeyId);
    service.setSecretKey(this.opts.access.secretAccessKey);
    service.setRegion(opts?.region || "cn-north-1");

    return service;
  }

  async getAlbService(opts: { region?: string }) {
    const CommonService = await this.getServiceCls();

    const service = new CommonService({
      serviceName: "alb",
      defaultVersion: "2020-04-01"
    });
    service.setAccessKeyId(this.opts.access.accessKeyId);
    service.setSecretKey(this.opts.access.secretAccessKey);
    service.setRegion(opts.region);

    return service;
  }

  async getVkeService(opts: { region?: string }) {
    const CommonService = await this.getServiceCls();

    const service = new CommonService({
      serviceName: "vke",
      defaultVersion: "2022-05-12"
    });
    service.setAccessKeyId(this.opts.access.accessKeyId);
    service.setSecretKey(this.opts.access.secretAccessKey);
    service.setRegion(opts.region);

    return service;
  }

  async getDCDNService( opts?: {  }) {
    const CommonService = await this.getServiceCls();

    const service = new CommonService({
      serviceName: "dcdn",
      defaultVersion: "2023-01-01"
    });
    service.setAccessKeyId(this.opts.access.accessKeyId);
    service.setSecretKey(this.opts.access.secretAccessKey);
    service.setRegion("cn-north-1");
    return service;
  }

  async getTOSService(opts: { region?: string }) {
    const { TosClient } = await import("@volcengine/tos-sdk");
    
    const client = new TosClient({
      accessKeyId: this.opts.access.accessKeyId,
      accessKeySecret: this.opts.access.secretAccessKey,
      region: opts.region,
      endpoint: `tos-${opts.region}.volces.com`
    });
    
    return client;
  }

  async getStsService() {
    const CommonService = await this.getServiceCls();

    const service = new CommonService({
      serviceName: "sts",
      defaultVersion: "2018-01-01"
    });
    service.setAccessKeyId(this.opts.access.accessKeyId);
    service.setSecretKey(this.opts.access.secretAccessKey);
    service.setRegion("cn-north-1");
    return service;
  }

  async getServiceCls() {
    if (this.CommonService) {
      return this.CommonService;
    }
    const { Service } = await import("@volcengine/openapi");

    class CommonService extends Service {
      Generic: any;

      constructor(options: {
        serviceName: string;
        defaultVersion: string;
      }) {
        super(Object.assign({ host: "open.volcengineapi.com" }, options));
        this.Generic = async (req: { action: string, body?: any, method?: string, query?: any ,version?:string}) => {
          const { action, method, body, query,version } = req;
          return await this.fetchOpenAPI({
            Action: action,
            Version: version||options.defaultVersion,
            method: method as any,
            headers: {
              "content-type": "application/json"
            },
            query: query || {},
            data: body
          });
        };
      }

      async request(req: { action: string, body?: any, method?: string, query?: any,version?:string }) {
        const res = await this.Generic(req);
        if (res ==="Not Found"){
          throw new Error(`${res} (检查method)`);
        }
        if (res.errorcode) {
          throw new Error(`${res.errorcode}:${res.message}`);
        }
        if (res.ResponseMetadata?.Error) {
          throw new Error(res.ResponseMetadata?.Error?.Message);
        }
        return res;
      }
    }

    this.CommonService = CommonService;
    return CommonService;
  }



}
