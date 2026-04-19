import {AccessInput, BaseAccess, IsAccess} from "@certd/pipeline";
import {HttpRequestConfig} from "@certd/basic";
import {CertInfo, CertReader} from "@certd/plugin-cert";

/**
 */
@IsAccess({
  name: "apisix",
  title: "APISIX授权",
  desc: "",
  icon: "svg:icon-lucky"
})
export class ApisixAccess extends BaseAccess {

  @AccessInput({
    title: "Apisix管理地址",
    component: {
      placeholder: "http://192.168.11.11:9180",
    },
    required: true,
  })
  endpoint = '';

  @AccessInput({
    title: 'ApiKey',
    component: {
      placeholder: 'ApiKey',
    },
    helper: "[参考文档](https://apisix.apache.org/docs/apisix/admin-api/#using-environment-variables)在config中配置admin apiKey",
    required: true,
    encrypt: true,
  })
  apiKey = '';

  @AccessInput({
    title: '版本',
    component: {
      name:"a-select",
      options: [
        {
          label: "v3.x",
          value: "3",
        },
        {
          label: "v2.x",
          value: "2",
        },
      ]
    },
    helper: "apisix系统的版本",
    value:"3",
    required: true,
  })
  version = '3';


  @AccessInput({
    title: "测试",
    component: {
      name: "api-test",
      action: "TestRequest"
    },
    helper: "点击测试接口是否正常"
  })
  testRequest = true;

  async onTestRequest() {
    await this.getCertList();
    return "ok"
  }

  async getCertList(){
    const sslPath = this.getSslPath();
    const req = {
      url :`/apisix/admin/${sslPath}`,
      method: "get",
    }
    return await this.doRequest(req);
  }

  getSslPath(){
    const sslPath = this.version === '3' ? 'ssls' : 'ssl';
    return sslPath;
  }

  async createCert(opts:{cert:CertInfo}){
    const certReader = new CertReader(opts.cert)
    const sslPath = this.getSslPath();
    const req = {
      url :`/apisix/admin/${sslPath}`,
      method: "post",
      data:{
        cert: opts.cert.crt,
        key: opts.cert.key,
        snis: certReader.getAllDomains()
      }
    }
    return await this.doRequest(req);
  }

  async updateCert (opts:{cert:CertInfo,id:string}){
    const certReader = new CertReader(opts.cert)
    const sslPath = this.getSslPath();
    const req = {
      url :`/apisix/admin/${sslPath}/${opts.id}`,
      method: "put",
      data:{
        cert: opts.cert.crt,
        key: opts.cert.key,
        snis: certReader.getAllDomains()
      }
    }
    return await this.doRequest(req);
  }

  async doRequest(req: HttpRequestConfig){
    const headers = {
      "X-API-KEY": this.apiKey,
      ...req.headers
    };
    return await this.ctx.http.request({
      headers,
      baseURL: this.endpoint,
      ...req,
      logRes: false,
    });
  }


}


new ApisixAccess();
