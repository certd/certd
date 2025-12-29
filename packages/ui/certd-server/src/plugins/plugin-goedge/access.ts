import {AccessInput, BaseAccess, IsAccess} from "@certd/pipeline";
import {HttpRequestConfig} from "@certd/basic";
import { CertInfo, CertReader } from "@certd/plugin-cert";
import dayjs from "dayjs";


/**
 */
@IsAccess({
  name: "goedge",
  title: "GoEdge授权",
  icon: "fa:leaf:#6C6BF6",
  order: 100
})
export class GoEdgeAccess extends BaseAccess {

  @AccessInput({
    title: "系统地址",
    component: {
        name: "a-input",
        vModel: "value"
    },
    helper:"例如：http://yourdomain.com:8002， 需要在API节点配置中开启HTTP访问地址",
    encrypt: false,
    required: true
  })
  endpoint!: string;

  @AccessInput({
    title: "用户类型",
    component: {
      name: "a-select",
      vModel: "value",
      options: [
        {
          label: "用户",
          value: "user"
        },
        {
          label: "管理员",
          value: "admin"
        }
      ]
    },
    encrypt: false,
    required: true
  })
  userType!: string;

  @AccessInput({
    title: "accessKeyId",
    helper:`用户AccessKey: 在”平台用户-用户-详情-AccessKey” 或 商业版的“访问控制” 中创建。
管理员AccessKey：在”系统用户-用户-详情-AccessKey” 中创建。`,
    component: {
      name: "a-input",
      vModel: "value"
    },
    encrypt: false,
    required: true
  })
  accessKeyId!: string;

  @AccessInput({
    title: "accessKey",
    component: {
      name: "a-input",
      vModel: "value"
    },
    encrypt: true,
    required: true
  })
  accessKey!: string;



  @AccessInput({
    title: "测试",
    component: {
      name: "api-test",
      action: "TestRequest"
    },
    helper: "点击测试接口是否正常"
  })
  testRequest = true;

  accessToken: {expiresAt:number,token:string}

  async onTestRequest() {
      await this.getCertList({pageSize:1});
      return "ok"
  }

  /**
   * 
   * @param req "id": 600,
    "isOn": true,
    "name": "124.220.225.222",
    "description": "",
    "certData": null,
    "keyData": null,
    "serverName": "",
    "isCA": false,
    "isACME": false,
    "timeBeginAt": 1763856000,
    "timeEndAt": 1771718399,
    "dnsNames": [
      "124.220.225.222" //domain
    ],
    "commonNames": [
      "ZeroSSL ECC Domain Secure Site CA",
      "USERTrust ECC Certification Authority"
    ],
    "ocsp": null,
    "ocspExpiresAt": 0,
    "ocspError": ""
   * @returns 
   */
  async getCertList(req:{pageNo?:number,pageSize?:number,query?:string,onlyUser?:boolean,userId?:number}){
    const pageNo = req.pageNo ?? 1;
    const pageSize = req.pageSize ?? 20;
    const body:any = {
        keyword: req.query??"",
	      offset: (pageNo-1)*pageSize,
        size: pageSize,
    }
     if (req.onlyUser){
      body["onlyUser"] = true;
    }
    if (req.userId){
      body["userId"] = req.userId;
    }

    const countRes = await this.doRequest({
      url: `/SSLCertService/countSSLCerts`,
      method: "POST",
      data:body
    });
    const total = countRes.count || 9999;

    const res = await this.doRequest({
      url: `/SSLCertService/listSSLCerts`,
      method: "POST",
      data:body
    });
    // this.ctx.logger.info("getCertList",JSON.stringify(res));
    const sslCertsJSON = this.ctx.utils.hash.base64Decode(res.sslCertsJSON) || "[]";
    const sslCerts = JSON.parse(sslCertsJSON) as CertInfo[];
    return {
      total: total,
      list: sslCerts || [],
      pageNo: pageNo,
      pageSize: pageSize
    }
  }

  async doCertReplace(req:{certId:number,cert:CertInfo}){

    const res = await this.doRequest({
      url: `/SSLCertService/findEnabledSSLCertConfig`,
      method: "POST",
      data: {
        sslCertId: req.certId,
      }
    });
    const sslCertJSON = this.ctx.utils.hash.base64Decode(res.sslCertJSON) || "{}";
    const sslCert = JSON.parse(sslCertJSON) ;

    const certReader = new CertReader(req.cert);
    const dnsNames = certReader.getAllDomains()
    
    // /product/sslcenter/{id}
    return await this.doRequest({
      url: `/SSLCertService/updateSSLCert`,
      method: "POST",
      data: {
        sslCertId: req.certId,
        certData: this.ctx.utils.hash.base64(req.cert.crt),
		    keyData: this.ctx.utils.hash.base64(req.cert.key),
        isOn: sslCert.isOn,
        name: sslCert.name || certReader.buildCertName(),
        description: sslCert.description || "upload by certd",
        serverName: sslCert.serverName,
        timeBeginAt: certReader.detail.notBefore.getTime()/1000,
        timeEndAt: certReader.detail.notAfter.getTime()/1000,
        dnsNames: dnsNames,
        /**
         * // 是否启用
	bool isOn;

	// 名称
	string name;

	// 描述（备注）
	string description;
	string serverName;
	bool isCA;
	bytes certData;
	bytes keyData;
	int64 timeBeginAt;
	int64 timeEndAt;
	[]string dnsNames;
	[]string commonNames;
         */
      }
    });

  }


  async getToken(){
    // /APIAccessTokenService/getAPIAccessToken
    if (this.accessToken && this.accessToken.expiresAt >dayjs().unix()){
      return this.accessToken;
    }

    const res = await this.doRequest({
      url: "/APIAccessTokenService/getAPIAccessToken",
      method: "POST",
      data: {
        type: this.userType,
        "accessKeyId": this.accessKeyId,
        "accessKey": this.accessKey,
      }
    });
    this.accessToken = res;
    return res;
  }

  async doRequest(req:HttpRequestConfig){

    const headers: Record<string,string> = {}
    if(!req.url.endsWith("/getAPIAccessToken")){
      if (!this.accessToken || this.accessToken.expiresAt < dayjs().unix()){
        await this.getToken();
      }
      headers["X-Edge-Access-Token"] = this.accessToken.token;
    }
    let endpoint = this.endpoint;
    if (endpoint.endsWith("/")){
      endpoint = endpoint.slice(0,-1);
    }
    const res =  await this.ctx.http.request({
      url: req.url,
      baseURL: endpoint,
      method: req.method|| "POST",
      data: req.data,
      params:  req.params,
      headers:{
        ...headers,
        ...req.headers
      },
      // httpProxy: this.httpProxy||undefined,
    });

    if (res.code === 200) {
      return res.data;
    }
    throw new Error(res.message || res);
  }
}



new GoEdgeAccess();
