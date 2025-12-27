import { IsAccess, AccessInput, BaseAccess } from '@certd/pipeline';

/**
 * 这个注解将注册一个授权配置
 * 在certd的后台管理系统中，用户可以选择添加此类型的授权
 */
@IsAccess({
  name: 'xinnetconnect',
  title: '新网互联授权',
  icon: 'svg:icon-xinnet',
  desc: '仅支持代理账号，ip需要加入白名单',
})
export class XinnetConnectAccess extends BaseAccess {
  /**
   * 授权属性配置
   */
  @AccessInput({
    title: '用户名',
    component: {
      placeholder: '代理用户名，如：agent001',
      help: '新网互联的代理用户名',
    },
    required: true,
    encrypt: false,
  })
  username = '';

  @AccessInput({
    title: '密码',
    component: {
      name: "a-input-password",
      vModel: "value",
      placeholder: '密码',
    },
    required: true,
    encrypt: true,
  })
  password = '';



  async addDnsRecord(req: {domain:string,hostRecord:string, value:string, type:string}): Promise<any> {
    const { domain,hostRecord, value, type } = req;
    const bodyXml =`
     <add>
        <domainname>${domain}</domainname>
        <resolvetype>${type}</resolvetype>
        <resolvehost>${hostRecord}</resolvehost>
        <resolvevalue>${value}</resolvevalue>
        <mxlevel>10</mxlevel>
      </add>`

    const res = await this.doRequest({
      url: "/addDnsRecordService",
      bodyXml: bodyXml,
      service: "addDnsRecord",
    })
    return res
  }

  async delDnsRecord(req: {domain:string,hostRecord:string, type:string,value:string}): Promise<any> {
    const { domain,hostRecord, type,value } = req;
    const bodyXml =`
     <del>
        <domainname>${domain}</domainname>
        <resolvetype>${type}</resolvetype>
        <resolvehost>${hostRecord}</resolvehost>
        <resolveoldvalue>${value}</resolveoldvalue>
        <mxlevel>10</mxlevel>
      </del>`

    const res = await this.doRequest({
      url: "/delDnsRecordService",
      bodyXml: bodyXml,
      service: "delDnsRecord",
    })
    return res
  }
  


  buildUserXml(){
      return `
      <user>
        <name>${this.username}</name>
        <password>${this.password}</password>
      </user>
      `
  }


  async doRequest(req: {bodyXml:string,service:string,url:string}) {

    const xml2js = await import('xml2js');

      const soapRequest = `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ws="http://ws/">
       <soapenv:Header/>
       <soapenv:Body>
          <ws:${req.service}>
             ${this.buildUserXml()}
             ${req.bodyXml}
          </ws:${req.service}>
       </soapenv:Body>
    </soapenv:Envelope>
    `;


    const response = await this.ctx.http.request({
      url: req.url,
      baseURL: "https://api.bizcn.com/rrpservices",
      data: soapRequest,
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': '' // 根据WSDL，soapAction为空
      },
      method: "POST",
      returnOriginRes: true,
    })


    // 解析SOAP响应
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(response.data);

    // 提取返回结果
    const soapBody = result['soap:Envelope']['soap:Body'];
    const addDnsRecordResponse = soapBody["ns1:addDnsRecordResponse"];
    console.log(addDnsRecordResponse)
    const resultData = addDnsRecordResponse.response.result;

    const res = {
      code: resultData.$.code,
      msg: resultData.msg
    }
    console.log('操作结果:', res);

    if (res.code != "200") {
      throw new Error(res.msg + " code:" + res.code);
    }

    return resultData;
  }

}

new XinnetConnectAccess();
