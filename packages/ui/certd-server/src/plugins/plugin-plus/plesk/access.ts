import { AccessInput, BaseAccess, IsAccess } from "@certd/pipeline";
import FormData from "form-data";
import { HttpError, HttpRequestConfig } from "@certd/basic";

export type PleskReq = {
  sessionId?: string;
  token?: string;
  formData?: FormData;
  checkRes?: boolean;
} & HttpRequestConfig;
/**
 */
@IsAccess({
  name: "plesk",
  title: "plesk授权",
  desc: "",
  icon: "svg:icon-plesk",
})
export class PleskAccess extends BaseAccess {
  @AccessInput({
    title: "Plesk网址",
    component: {
      name: "a-input",
      vModel: "value",
    },
    required: true,
    helper: "例如：https://xxxx.xxxxx:8443/",
  })
  url!: string;

  @AccessInput({
    title: "用户名",
    component: {
      placeholder: "username",
    },
    required: true,
    encrypt: false,
  })
  username = "";

  @AccessInput({
    title: "登录密码",
    component: {
      placeholder: "password",
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
    const sessionId = await this.getSessionId();
    if (!sessionId) {
      throw new Error("获取sessionId失败");
    }
    return "ok";
  }

  async getSessionId() {
    const formData = new FormData();
    formData.append("login_name", this.username);
    formData.append("passwd", this.password);
    formData.append("locale_id", "default");

    try {
      await this.ctx.http.request({
        url: `/login_up.php`,
        baseURL: this.url,
        method: "post",
        headers: {
          origin: this.url,
          ...formData.getHeaders(),
        },
        data: formData,
        withCredentials: true,
        logRes: false,
        returnOriginRes: true,
        maxRedirects: 0,
      });
    } catch (e: any) {
      if (e && e instanceof HttpError && e.status === 303 && e.response) {
        //获取cookie
        const cookies = e.response.headers.get("set-cookie");
        const sessId = cookies[0].match(/PLESKSESSID=(.*?);/)[1];
        if (sessId) {
          this.ctx.logger.info(`获取Plesk SessionId 成功`);
          return sessId;
        }
      }
      throw e;
    }
  }

  async getCertList(sessionId: string) {
    const detail = await this.doGetRequest({
      url: "modules/sslit/index.php/main-page/index",
      sessionId,
    });

    // "domainList": [  ...  "domainSummaryEnabled":

    const listStr = detail.match(/"domainList":(.*?),"domainSummaryEnabled"/)[1];

    const list = JSON.parse(listStr);

    const token = this.getTokenFromDetail(detail);

    return { list, token };
  }

  getTokenFromDetail(detail: string) {
    return detail.match(/forgery_protection_token" content="(.*?)"/)[1];
  }

  async doGetRequest(req: PleskReq) {
    const detail = await this.ctx.http.request({
      //https://vps-b6941c0f.vps.ovh.net:8443/modules/sslit/index.php/index/certificate/id/2
      url: req.url,
      baseURL: this.url,
      method: req.method ?? "get",
      withCredentials: true,
      headers: {
        Cookie: `PLESKSESSID=${req.sessionId}`,
      },
      logRes: false,
    });
    return detail;
  }

  async doEditRequest(req: PleskReq) {
    const res = await this.ctx.http.request({
      url: req.url,
      baseURL: this.url,
      method: req.method ?? "post",
      withCredentials: true,
      headers: {
        //     Origin:
        //     https://vps-b6941c0f.vps.ovh.net:8443
        // Referer:
        //   https://vps-b6941c0f.vps.ovh.net:8443/modules/sslit/index.php/index/certificate/id/1
        Cookie: `PLESKSESSID=${req.sessionId}`,
        Origin: this.url,
        "X-Forgery-Protection-Token": req.token,
        ...req.formData.getHeaders(),
      },
      logRes: req.logRes ?? false,
      data: req.formData,
    });

    if (req.checkRes === false) {
      return res;
    }

    if (res && res.status === "success") {
      return res;
    } else {
      throw new Error(`${JSON.stringify(res.actionMessages || res.statusMessages || res)}`);
    }
  }

  async deleteUnusedCert(req: { sessionId: any; token: string; siteDomainId: number }) {
    //查询哪些证书是未使用的
    let detail = await this.doGetRequest({
      url: `/smb/ssl-certificate/list/id/${req.siteDomainId}`,
      sessionId: req.sessionId,
    });
    detail = detail.substring(detail.indexOf("Plesk.require('app/ssl-certificate/list',"));
    // "data": [....] "locale":
    const listStr1 = detail.match(/"data":(.*?),"locale"/)[1];
    const listStr = listStr1.match(/"data":(.*)/)[1];
    const list = JSON.parse(listStr);
    const unused = list.filter((item: any) => item.usageCount === "0").map(item => item.id);
    if (unused.length === 0) {
      this.ctx.logger.info(`没有未使用的证书`);
      return;
    }
    const formData = new FormData();
    for (let i = 0; i < unused.length; i++) {
      formData.append(`ids[${i}]`, unused[i]);
    }

    await this.doEditRequest({
      url: `/smb/ssl-certificate/delete/id/${req.siteDomainId}`,
      sessionId: req.sessionId,
      method: "post",
      formData,
      token: req.token,
      logRes: false,
    });
    this.ctx.logger.info(`删除未使用的证书成功`);
  }
}

new PleskAccess();
