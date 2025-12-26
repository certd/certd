import { IsAccess, AccessInput, BaseAccess, Pager, PageSearch } from "@certd/pipeline";
import crypto from "crypto";
/**
 * 这个注解将注册一个授权配置
 * 在certd的后台管理系统中，用户可以选择添加此类型的授权
 */
@IsAccess({
  name: "xinnetagent",
  title: "新网授权（代理方式）",
  icon: "svg:icon-xinnet",
  desc: ""
})
export class XinnetAgentAccess extends BaseAccess {

  /**
   * 授权属性配置
   */
  @AccessInput({
    title: "代理账号",
    component: {
      placeholder: "代理账号，如：agent0001"
    },
    required: true,
    encrypt: false
  })
  agentCode = "";

  @AccessInput({
    title: "API密钥",
    component: {
      name: "a-input-password",
      vModel: "value",
      placeholder: "API密钥"
    },
    required: true,
    encrypt: true
  })
  appSecret = "";

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

    // const client = new XinnetClient({
    //   access: this,
    //   logger: this.ctx.logger,
    //   http: this.ctx.http
    // });
    await this.getDomainList({ pageNo: 1, pageSize: 1 });

    return "ok";
  }



  async getDomainList(req:PageSearch) {
    const pager = new Pager(req);
    const conf = {
      url: "/api/domain/list",
      data: {
        pageNo: String(pager.pageNo),
        pageSize: String(pager.pageSize)
      }
    }
    return await this.doRequest(conf);
  }

  
  /**
   * 生成 UTC 0 时区的时间戳
   */
  generateTimestamp() {
    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z").replaceAll(":", "").replaceAll("-", "");
    return timestamp;
  }

  /**
   * 字节转16进制字符串
   */
  bytesToHex(bytes:any) {
    return bytes.toString('hex');
  }

  /**
   * 生成签名
   */
  generateSignature(timestamp, urlPath, requestBody) {
    const algorithm = 'HMAC-SHA256';
    const requestMethod = 'POST';
    
    // 构建待签名字符串
    const stringToSign = `${algorithm}\n${timestamp}\n${requestMethod}\n${urlPath}\n${requestBody}`;
    
    // 使用 HMAC-SHA256 计算签名
    const hmac = crypto.createHmac('sha256', this.appSecret);
    hmac.update(stringToSign);
    const signatureBytes = hmac.digest();
    
    // 转换为16进制字符串
    return this.bytesToHex(signatureBytes);
  }

  /**
   * 生成 authorization header
   */
  generateAuthorization(timestamp, urlPath, requestBody) {
    const signature = this.generateSignature(timestamp, urlPath, requestBody);
    return `HMAC-SHA256 Access=${this.agentCode}, Signature=${signature}`;
  }

  /**
   * 查询域名分页列表
   */
  async doRequest(req:any) {

    const baseURL = 'https://apiv2.xinnet.com';
    const urlPath = req.url;
    const requestURL = baseURL + urlPath; // 实际请求URL去掉最后的斜杠
    
    // 请求体
    const requestBody = JSON.stringify(req.data);

    // 生成时间戳和授权头
    const timestamp = this.generateTimestamp();
    const authorization = this.generateAuthorization(timestamp, urlPath+"/", requestBody);

    // 请求配置
    const config = {
      method: 'POST',
      url: requestURL,
      headers: {
        'Content-Type': 'application/json',
        'timestamp': timestamp,
        'authorization': authorization
      },
      data: requestBody,
    };

      const res =  await this.ctx.http.request(config);
     
      if (res.code !="0"){
        throw new Error(`API Error: ${res.code} ${res.requestId} - ${JSON.stringify(res.msg)}`);
      }
      return res.data;
  }

}

new XinnetAgentAccess();
