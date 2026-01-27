import { IsAccess, AccessInput, BaseAccess } from '@certd/pipeline';
import { CertInfo, CertReader } from '@certd/plugin-cert';

/**
 * 这个注解将注册一个授权配置
 * 在certd的后台管理系统中，用户可以选择添加此类型的授权
 */
@IsAccess({
  name: 'ucloud',
  title: 'UCloud授权',
  icon: 'svg:icon-ucloud',
  desc: '优刻得授权',
})
export class UCloudAccess extends BaseAccess {

  /**
   * 授权属性配置
   */
  @AccessInput({
    title: '项目Id',
    component: {
      placeholder: '项目Id',
    },
    helper: "[项目管理](https://console.ucloud.cn/uaccount/iam/project_manage)项目ID列获取",
    required: true,
    encrypt: false,
  })
  projectId = '';


  /**
   * 授权属性配置
   */
  @AccessInput({
    title: '公钥',
    component: {
      placeholder: '公钥',
    },
    helper: "[Api管理](https://console.ucloud.cn/uaccount/api_manage)获取",
    required: true,
    encrypt: false,
  })
  publicKey = '';

  @AccessInput({
    title: '私钥',
    component: {
      name: "a-input-password",
      vModel: "value",
      placeholder: '私钥',
    },
    required: true,
    encrypt: true,
  })
  privateKey = '';



  @AccessInput({
    title: "测试",
    component: {
      name: "api-test",
      action: "TestRequest"
    },
    helper: "点击测试接口是否正常"
  })
  testRequest = true;

  client: any;

  async onTestRequest() {
    await this.ProjectList();
    return "ok";
  }


  async getClient(region?:string) {
    if (this.client) {
      return this.client;
    }
    const { Client } = await import('@ucloud-sdks/ucloud-sdk-js');
    const client = new Client({
      config: {
        region: region || 'cn-bj2',
        projectId: this.projectId || "",
        baseUrl: "https://api.ucloud.cn"
      },
      credential: {
        publicKey: this.publicKey,
        privateKey: this.privateKey,
      }
    });
    this.client = client;
    return client
  }

  async ProjectList() {
    const client = await this.getClient();
    const resp = await client.uaccount().getProjectList({
      "Action": "GetProjectList"
    });
    this.ctx.logger.info(`获取到项目列表:${JSON.stringify(resp)}`);
    return resp;
  }

  async GetRegion() {
    const client = await this.getClient();
    const res = await client.uaccount().getRegion({
      "Action": "GetRegion"
    });
    // this.ctx.logger.info(`获取到区域列表:${JSON.stringify(res)}`);
    return res;
  }

  async CdnDominList(req: { PageNo: number, PageSize: number }) {
    const client = await this.getClient();
    const resp = await client.ucdn().getUcdnDomainInfoList({
      "Action": "GetUcdnDomainInfoList",
      "ProjectId": this.projectId || "",
      "PageNo": req.PageNo,
      "PageSize": req.PageSize,
    });
    this.ctx.logger.info(`获取到CDN域名列表:${JSON.stringify(resp)}`);
    return resp;
  }

  async CdnAddCert(req: { certName: string, cert: CertInfo }) {
    const client = await this.getClient();
    const resp = await client.ucdn().addCertificate({
      "Action": "AddCertificate",
      "ProjectId": this.projectId || "",
      "CertName": req.certName,
      "UserCert": req.cert.crt,
      "PrivateKey": req.cert.key
    });
    this.ctx.logger.info(`添加CDN证书:${JSON.stringify(resp)}`);
    return resp;
  }


  async SslUploadCert(req: { cert: CertInfo }) {
    const { cert } = req
    /**
&SslPublicKey=lXUzWbSR
&SslCaKey=lXUzWbSR
&SslMD5=lXUzWbSR
&CertificateName=GoodCertcification
     */
    const certReader = new CertReader(cert)
    const certName = certReader.buildCertName()
    const crtBase64 = this.ctx.utils.hash.base64(cert.crt)
    const keyBase64 = this.ctx.utils.hash.base64(cert.key)
    const allDomains = certReader.getAllDomains().join(",")

    this.ctx.logger.info(`----------- 上传USSL证书，certName:${certName},domains:${allDomains}`);
    try {
      const resp = await this.invoke({
        Action: "UploadNormalCertificate",
        "SslPublicKey": crtBase64,
        "SslPrivateKey": keyBase64,
        "CertificateName": certName,
        "SslMD5": this.ctx.utils.hash.md5(crtBase64 + keyBase64)
      });
      this.ctx.logger.info(`----------- 上传USSL证书成功，certId:${resp.CertificateID}`);
      return { type: "ussl", id: resp.CertificateID, name: certName, resourceId: resp.LongResourceID, domains: allDomains }
    } catch (err) {

      if (err.message.includes("重复上传证书")) {
        //查找证书
        const certList = await this.SslGetCertList(certReader.getMainDomain());

        const cert = certList.find((item: any) => item.Domains === allDomains)
        if (cert) {
          this.ctx.logger.info(`----------- 找到已存在证书，certId:${cert.CertificateID}`);
          return { type: "ussl", id: cert.CertificateID, name: certName, domains: cert.Domains }
        }
      }

      this.ctx.logger.error(`上传USSL证书失败:${err}`);
      throw err;
    }


  }

  async SslGetCertList(domain: string) {
    const resp = await this.invoke({
      Action: "GetCertificateList",
      Mode: "trust",
      Domain: domain,
      Sort: "2"
    });
    return resp.CertificateList || [];
  }

  async WafSiteList(req: { PageNo: number, PageSize: number , FullDomain?: string }):Promise<{DomainHostList?:{RecordId:string,FullDomain:string}[],TotalCount:number}> {
    const resp = await this.invoke({
      "Action": "DescribeWafDomainHostInfo",
      "ProjectId": this.projectId,
      "Limit": req.PageSize,
      "Offset": (req.PageNo - 1) * req.PageSize,
      "FullDomain": req.FullDomain || undefined
    });
    this.ctx.logger.info(`获取到WAF站点列表:${JSON.stringify(resp)}`);
    return resp;
  }


  async invoke(req: { Action: string, [key: string]: any }) {
    const { Request } = await import('@ucloud-sdks/ucloud-sdk-js');
    const client = await this.getClient();
    const resp = await client.invoke(new Request({
      ...req
    }));
    // this.ctx.logger.info(`请求UCloud API:${JSON.stringify(resp)}`);
    const res = resp.data || {}
    if (res.RetCode !== 0) {
      throw new Error(res.Message)
    }

    return res;
  }

}

new UCloudAccess();
