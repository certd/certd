import { AccessInput, BaseAccess, IsAccess, PageSearch } from "@certd/pipeline";

/**
 管理页面地址：https://www.dns.com.cn/login/toLogin.do
是否有API接口，接口地址：https://api.bizcn.com/rrpservices
 */
@IsAccess({
  name: "xinnetconnect",
  title: "新网互联授权",
  icon: "svg:icon-xinnet",
  desc: "仅支持代理账号，ip需要加入白名单",
})
export class XinnetConnectAccess extends BaseAccess {
  /**
   * 授权属性配置
   */
  @AccessInput({
    title: "用户名",
    component: {
      placeholder: "代理用户名，如：agent001",
      help: "新网互联的代理用户名",
    },
    required: true,
    encrypt: false,
  })
  username = "";

  @AccessInput({
    title: "密码",
    component: {
      name: "a-input-password",
      vModel: "value",
      placeholder: "密码",
    },
    required: true,
    encrypt: true,
  })
  password = "";

  @AccessInput({
    title: "测试",
    component: {
      name: "api-test",
      action: "onTestRequest",
    },
    helper: "点击测试接口看是否正常",
  })
  testRequest = true;

  async onTestRequest() {
    await this.getDomainList({
      pageNo: 1,
      pageSize: 10,
    });
    return "ok";
  }

  async getDomainList(req: PageSearch): Promise<any> {
    let bodyXml = `
    <limit>${req.pageSize}</limit>
    <offset>${req.pageNo}</offset>
    `;
    if (req.searchKey) {
      bodyXml += `<domainname>${req.searchKey}</domainname>`;
    }

    const res = await this.doRequest({
      url: "/domainService",
      bodyXml: bodyXml,
      service: "getDomainList",
    });
    return res;
  }

  async addDnsRecord(req: { domain: string; hostRecord: string; value: string; type: string }): Promise<any> {
    const { domain, hostRecord, value, type } = req;
    const bodyXml = `
     <add>
        <domainname>${domain}</domainname>
        <resolvetype>${type}</resolvetype>
        <resolvehost>${hostRecord}</resolvehost>
        <resolvevalue>${value}</resolvevalue>
        <mxlevel>10</mxlevel>
      </add>`;

    const res = await this.doRequest({
      url: "/addDnsRecordService",
      bodyXml: bodyXml,
      service: "addDnsRecord",
    });
    return res;
  }

  async delDnsRecord(req: { domain: string; hostRecord: string; type: string; value: string }): Promise<any> {
    const { domain, hostRecord, type, value } = req;
    const bodyXml = `
     <del>
        <domainname>${domain}</domainname>
        <resolvetype>${type}</resolvetype>
        <resolvehost>${hostRecord}</resolvehost>
        <resolveoldvalue>${value}</resolveoldvalue>
        <mxlevel>10</mxlevel>
      </del>`;

    const res = await this.doRequest({
      url: "/delDnsRecordService",
      bodyXml: bodyXml,
      service: "delDnsRecord",
    });
    return res;
  }

  buildUserXml() {
    return `
      <user>
        <name>${this.username}</name>
        <password>${this.password}</password>
      </user>
      `;
  }

  async doRequest(req: { bodyXml: string; service: string; url: string }) {
    const xml2js = await import("xml2js");

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
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: "", // 根据WSDL，soapAction为空
      },
      method: "POST",
      returnOriginRes: true,
    });

    // 解析SOAP响应
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(response.data);

    // 提取返回结果
    const soapBody = result["soap:Envelope"]["soap:Body"];
    const keys = Object.keys(soapBody);
    if (keys.length === 0) {
      throw new Error("SOAP响应体为空");
    }
    const addDnsRecordResponse = soapBody[keys[0]];
    this.ctx.logger.info(addDnsRecordResponse);
    const resultData = addDnsRecordResponse.response.result;

    const res = {
      code: resultData.$.code,
      msg: resultData.msg,
    };
    this.ctx.logger.info("操作结果:", res);

    if (res.code != "200") {
      throw new Error(res.msg + " code:" + res.code);
    }

    return resultData;
  }
}

new XinnetConnectAccess();
