import { AccessInput, BaseAccess, IsAccess } from "@certd/pipeline";
import { HttpRequestConfig } from "@certd/basic";
import { CertInfo } from "@certd/plugin-cert";

/**
 */
@IsAccess({
  name: "wangsu",
  title: "网宿授权",
  desc: "",
  icon: "svg:icon-wangsu",
})
export class WangsuAccess extends BaseAccess {
  @AccessInput({
    title: "accessKeyId",
    component: {
      placeholder: "accessKeyId",
      component: {
        name: "a-input",
        vModel: "value",
      },
    },
    helper: "[点击前往获取AccessKey](https://console.wangsu.com/account/accessKey?rsr=ws)",
    encrypt: false,
    required: true,
  })
  accessKeyId!: string;

  @AccessInput({
    title: "accessKeySecret",
    component: {
      placeholder: "accessKeySecret",
      component: {
        name: "a-input",
        vModel: "value",
      },
    },
    encrypt: true,
    required: true,
  })
  accessKeySecret!: string;

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
    await this.getCertList({});
    return "ok";
  }

  async getCertList(req: Record<string, never>) {
    /**
     * certificate-id
     * name
     * dns-names
     */
    const res = await this.doRequest({
      url: "/api/ssl/certificate",
      method: "GET",
    });

    return res["ssl-certificate"];
  }

  async getCertInfo(req: { certId: string }) {
    return await this.doRequest({
      url: `/api/certificate/${req.certId}`,
      method: "GET",
    });
  }

  async updateCert(req: { certId: string; cert: CertInfo }) {
    const certInfo = await this.getCertInfo({ certId: req.certId });

    const name = certInfo.name;
    const { cert, certId } = req;
    return await this.doRequest({
      url: `/api/certificate/${certId}`,
      method: "PUT",
      data: {
        /**
         * name: string;
         *   certificate?: string;
         *   privateKey?: string;
         *   autoRenew?: string;
         *   isNeedAlarm?: string;
         *   csrId?: number;
         *   comment?: string;
         */
        name: name,
        certificate: cert.crt,
        privateKey: cert.key,
        autoRenew: "false",
        isNeedAlarm: "false",
        comment: "certd",
      },
    });
  }

  async doRequest(req: HttpRequestConfig) {
    const data: any = req.data;

    const { AkSkConfig, AkSkAuth } = await import("./lib/index.js");

    const akskConfig = new AkSkConfig();
    akskConfig.accessKey = this.accessKeyId;
    akskConfig.secretKey = this.accessKeySecret;
    akskConfig.endPoint = "open.chinanetcenter.com";
    akskConfig.uri = req.url;
    akskConfig.method = req.method;

    const requestMsg = AkSkAuth.transferHttpRequestMsg(akskConfig, data ? JSON.stringify(data) : "");
    AkSkAuth.getAuthAndSetHeaders(requestMsg, akskConfig.accessKey, akskConfig.secretKey);

    let response = undefined;
    try {
      response = await this.ctx.http.request({
        method: requestMsg.method,
        url: requestMsg.url,
        headers: requestMsg.headers,
        data: requestMsg.body,
      });
    } catch (e) {
      if (e.response?.data?.result) {
        throw new Error(e.response?.data?.result);
      }
      throw e;
    }

    if (response.code != null && response.code != 0) {
      throw new Error(response.message);
    }
    if (response.data != null && response.code !== null) {
      return response.data;
    }
    return response;
  }
}

new WangsuAccess();
