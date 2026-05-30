import { AccessInput, BaseAccess, IsAccess } from "@certd/pipeline";
import { HttpRequestConfig } from "@certd/basic";
import { CertInfo, CertReader } from "@certd/plugin-cert";

/**
 */
@IsAccess({
  name: "farcdn",
  title: "farcdn授权",
  desc: "",
  icon: "svg:icon-lucky",
})
export class FarcdnAccess extends BaseAccess {
  @AccessInput({
    title: "接口地址",
    value: "https://open.farcdn.net/api/source",
    component: {
      placeholder: "https://open.farcdn.net/api/source",
      name: "a-input",
      vModel: "value",
    },
    required: true,
  })
  endpoint!: string;

  @AccessInput({
    title: "accessKeyId",
    component: {
      placeholder: "accessKeyId",
      component: {
        name: "a-input",
        vModel: "value",
      },
    },
    encrypt: false,
    required: true,
  })
  accessKeyId!: string;

  @AccessInput({
    title: "accessKey",
    component: {
      placeholder: "accessKey",
      component: {
        name: "a-input",
        vModel: "value",
      },
    },
    encrypt: true,
    required: true,
  })
  accessKey!: string;

  @AccessInput({
    title: "HttpProxy",
    component: {
      placeholder: "http://192.168.x.x:10811",
      component: {
        name: "a-input",
        vModel: "value",
      },
    },
    encrypt: false,
    required: false,
  })
  httpProxy!: string;

  @AccessInput({
    title: "测试",
    component: {
      name: "api-test",
      action: "TestRequest",
    },
    helper: "点击测试接口是否正常",
  })
  testRequest = true;

  async onTestRequest() {
    await this.getSSLCertList({ size: 1 });
    return "ok";
  }

  async getSSLCertList(req: { offset?: number; size?: number }) {
    return await this.doRequest({
      url: "/getSSLCertList",
      data: req,
    });
  }

  async findSSLCertConfig(sslCertId: number) {
    /**
     * 接口地址
     * POST /findSSLCertConfig
     * 🎯 功能说明
     * 根据证书ID和认证信息查询SSL证书的详细配置信息，包括证书状态、域名绑定、有效期等关键信息。
     *
     * 📥 请求参数
     * 参数名	类型	必填	说明	示例值
     * sslCertId	int	✅	证书唯一标识ID	2106
     * accessKeyId	string	✅	访问密钥ID	u2ZF6k63dFCOS7It
     * accessKey	string	✅	访问密钥	mTGaNRGUFHj3r3YxMrrg5XSGIXd6rBWG',
     * 响应结构：
     *
     * {
     *   "code": 200,
     *   "data": {...},
     *   "message": "获取成功"
     * }
     */

    const params = {
      sslCertId,
    };
    const res = await this.doRequest({
      url: "/findSSLCertConfig",
      data: params,
    });
    this.ctx.logger.info(`找到证书${sslCertId}: name=${res.name},domain=${res.commonNames},dnsNames=${res.dnsNames}`);
    return res;
  }

  async updateSSLCert(req: { sslCertId: number; cert: CertInfo }) {
    /**
     * isOn	boolean	✅	是否启用证书	true
     * name	string	✅	证书显示名称	"example.com"
     * description	string	✅	证书描述信息	"主域名SSL证书"
     * serverName	string	✅	关联的服务器名称	"web-server-01"
     * isCA	boolean	✅	是否为CA根证书	false
     * certData	string	✅	证书内容（PEM格式）	"-----BEGIN CERTIFICATE-----..."
     * keyData	string	✅	私钥内容（PEM格式）	"-----BEGIN PRIVATE KEY-----..."
     * timeBeginAt	int/long	✅	证书生效时间（毫秒时间戳）	1719830400000
     * timeEndAt	int/long	✅	证书过期时间（毫秒时间戳）	1751366400000
     * dnsNames	string[]	✅	证书绑定的域名列表	["example.com", "*.example.com"]
     * commonNames	string[]	✅	证书的通用名称列表	["example.com"]
     */

    const oldCert = await this.findSSLCertConfig(req.sslCertId);
    const certReader = new CertReader(req.cert);
    const { detail } = certReader.getCrtDetail();
    const params = {
      sslCertId: req.sslCertId,
      certData: req.cert.crt,
      keyData: req.cert.key,
      isOn: true,
      isCA: false,
      serverName: oldCert.serverName || certReader.getMainDomain(),
      commonNames: [certReader.getMainDomain()],
      dnsNames: certReader.getAltNames(),
      timeBeginAt: detail.notBefore.getTime(),
      timeEndAt: detail.notAfter.getTime(),
      name: oldCert.name || certReader.buildCertName(),
      description: oldCert.description || "",
    };

    return await this.doRequest({
      url: "/updateSSLCert",
      data: params,
    });
  }

  async doRequest(req: HttpRequestConfig) {
    const params = {
      ...req.data,
      accessKeyId: this.accessKeyId,
      accessKey: this.accessKey,
    };
    const res = await this.ctx.http.request({
      url: req.url,
      baseURL: this.endpoint,
      method: "POST",
      data: params,
      httpProxy: this.httpProxy || undefined,
    });

    if (res.code === 200) {
      return res.data;
    }
    throw new Error(res.message || res);
  }
}

new FarcdnAccess();
