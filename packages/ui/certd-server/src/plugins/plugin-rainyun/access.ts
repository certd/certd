import {AccessInput, BaseAccess, IsAccess} from "@certd/pipeline";
import {HttpRequestConfig} from "@certd/basic";
import { CertInfo } from "@certd/plugin-cert";


/**
 */
@IsAccess({
  name: "rainyun",
  title: "雨云授权",
  desc: "https://app.rainyun.com/",
  icon: "svg:icon-rainyun",
  order: 100
})
export class RainyunAccess extends BaseAccess {


  @AccessInput({
    title: "ApiKey",
    component: {
      placeholder: "api-key",
      name: "a-input",
      vModel: "value"
    },
    helper:"https://app.rainyun.com/account/settings/api-key",
    encrypt: true,
    required: true
  })
  apiKey!: string;



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
      await this.getDomainList({limit:1});
      return "ok"
  }

  // {"columnFilters":{"domains.Domain":"domain"},"sort":[],"page":1,"perPage":20}
  async getDomainList(req:{offset?:number,limit?:number,query?:string}){
    const size = req.limit ?? 20;
    const offset = req.offset ?? 0;
    let page = Math.floor(offset / size);
    if(offset % size === 0 ){
      page++
    }
    const options ={
      page: page,
      perPage: size,
      columnFilters: {
        "domains.Domain": req.query??""
      },
    }
    const res = await this.doRequest({
      url: `/product/domain/?options=${encodeURIComponent(JSON.stringify(options))}`,
      method: "GET",
    });

    return {
      total: res.TotalRecords,
      list: res.Records || [],
      limit: size,
      offset: offset
    }
  }


  async getCertList(req:{pageNo?:number,pageSize?:number,query?:string}){
    const pageNo = req.pageNo ?? 1;
    const pageSize = req.pageSize ?? 20;
    const options ={
      columnFilters: {
        Domain: req.query??""
      },
      sort:[],
      page: pageNo,
      perPage: pageSize,

    }
    const res = await this.doRequest({
      url: `product/sslcenter/?options=${encodeURIComponent(JSON.stringify(options))}`,
      method: "GET",
    });

    return {
      total: res.TotalRecords,
      list: res.Records || [],
      pageNo: pageNo,
      pageSize: pageSize
    }
  }

  async doCertReplace(req:{certId:number,cert:CertInfo}){

    // /product/sslcenter/{id}
    return await this.doRequest({
      url: `product/sslcenter/${req.certId}`,
      method: "PUT",
      data: {
        cert: req.cert.crt,
        key: req.cert.key,
      }
    });

  }


  async getDomainId(domain:string){
    const res = await this.getDomainList({query: domain,limit:1});
    if (res.list.length === 0) {
      throw new Error(`域名${domain}不存在`  );
    }
    return res.list[0].id;
  }

  async doRequest(req:HttpRequestConfig){
    const res =  await this.ctx.http.request({
      url: req.url,
      baseURL:"https://api.v2.rainyun.com",
      method: req.method|| "POST",
      data: req.data,
      params:  req.params,
      headers:{
        "X-Api-Key": this.apiKey
      },
      // httpProxy: this.httpProxy||undefined,
    });

    if (res.code === 200) {
      return res.data;
    }
    throw new Error(res.message || res);
  }
}



new RainyunAccess();
