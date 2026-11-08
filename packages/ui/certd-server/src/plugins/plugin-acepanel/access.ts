import { AccessInput, BaseAccess, IsAccess, Pager, PageSearch } from "@certd/pipeline";
import { HttpRequestConfig } from "@certd/basic";
import crypto from "crypto";
import url from "url";

/**
 * 比较点分版本号：left 大于 right 返回 1，小于返回 -1，相等返回 0
 */
export function compareVersion(left: string, right: string) {
  const leftParts = String(left || "").split(".");
  const rightParts = String(right || "").split(".");
  const maxLength = Math.max(leftParts.length, rightParts.length);
  for (let i = 0; i < maxLength; i++) {
    const leftValue = Number.parseInt(leftParts[i] || "0", 10);
    const rightValue = Number.parseInt(rightParts[i] || "0", 10);
    if (Number.isNaN(leftValue) || Number.isNaN(rightValue)) {
      return -1;
    }
    if (leftValue > rightValue) {
      return 1;
    }
    if (leftValue < rightValue) {
      return -1;
    }
  }
  return 0;
}

/**
 * AcePanel授权
 */
@IsAccess({
  name: "acepanel",
  title: "AcePanel授权",
  desc: "",
  icon: "svg:icon-lucky",
  i18n: {
    "en-US": {
      title: "AcePanel Access",
      desc: "AcePanel IAM access.",
    },
  },
})
export class AcePanelAccess extends BaseAccess {
  @AccessInput({
    title: "AcePanel管理地址",
    component: {
      placeholder: "http://127.0.0.1:25475/entrance",
    },
    helper: "请输入AcePanel管理地址，格式为http://127.0.0.1:25475/entrance, 要带安全入口，最后面不要加/",
    required: true,
  })
  endpoint = "";

  @AccessInput({
    title: "访问令牌ID",
    component: {
      name: "a-input-number",
      vModel: "value",
    },
    helper: "AcePanel控制台->设置->用户->访问令牌->创建访问令牌",
    required: true,
  })
  tokenId: number;

  @AccessInput({
    title: "访问令牌",
    component: {
      placeholder: "AccessToken",
    },
    helper: "创建访问令牌后复制该令牌填到这里",
    required: true,
    encrypt: true,
  })
  accessToken = "";

  @AccessInput({
    title: "忽略证书校验",
    value: true,
    component: {
      name: "a-switch",
      vModel: "checked",
    },
    helper: "如果面板的url是https，且使用的是自签名证书，则需要开启此选项，其他情况可以关闭",
  })
  skipSslVerify: boolean;

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
    await this.testApi();
    return "ok";
  }

  /**
   * 计算字符串的SHA256哈希值
   */
  sha256Hash(text: string) {
    return crypto
      .createHash("sha256")
      .update(text || "")
      .digest("hex");
  }

  /**
   * 使用HMAC-SHA256算法计算签名
   */
  hmacSha256(key: string, message: string) {
    return crypto.createHmac("sha256", key).update(message).digest("hex");
  }

  /**
   * 为API请求生成签名
   */
  signRequest(method: string, apiUrl: string, body: string, id: number, token: string) {
    // 解析URL
    const parsedUrl = new url.URL(apiUrl);
    const path = parsedUrl.pathname;
    const query = parsedUrl.search.slice(1); // 移除开头的'?'

    // 规范化路径
    let canonicalPath = path;
    if (!path.startsWith("/api")) {
      const apiPos = path.indexOf("/api");
      if (apiPos !== -1) {
        canonicalPath = path.slice(apiPos);
      }
    }

    // 构造规范化请求
    const canonicalRequest = [method, canonicalPath, query, this.sha256Hash(body || "")].join("\n");

    // 获取当前时间戳
    const timestamp = Math.floor(Date.now() / 1000);

    // 构造待签名字符串
    const stringToSign = ["HMAC-SHA256", timestamp, this.sha256Hash(canonicalRequest)].join("\n");

    // 计算签名
    const signature = this.hmacSha256(token, stringToSign);

    return {
      timestamp,
      signature,
      id,
    };
  }

  async doRequest(req: HttpRequestConfig) {
    let endpoint = this.endpoint;
    if (endpoint.endsWith("/")) {
      endpoint = endpoint.slice(0, -1);
    }
    const fullUrl = endpoint + req.url;

    const method = req.method || "GET";
    const body = req.data ? JSON.stringify(req.data) : "";
    const token = this.accessToken;
    const tokenId = this.tokenId;
    const signingData = this.signRequest(method, fullUrl, body, tokenId, token);

    // 准备HTTP请求头
    const headers = {
      "Content-Type": "application/json",
      "X-Timestamp": signingData.timestamp,
      Authorization: `HMAC-SHA256 Credential=${signingData.id}, Signature=${signingData.signature}`,
    };

    // 发送请求
    const res = await this.ctx.http.request({
      ...req,
      method,
      headers,
      url: fullUrl,
      // baseURL: this.endpoint,
      logRes: false,
      skipSslVerify: this.skipSslVerify,
    });

    return res;
  }

  async testApi() {
    await this.getWebSiteList({
      pageNo: 1,
      pageSize: 1,
    });

    return "ok";
  }

  async getWebSiteList(opts: PageSearch) {
    const pager = new Pager(opts);
    const req = {
      url: `/api/website?limit=${pager.pageSize}&page=${pager.pageNo}&type=all`,
      method: "GET",
    };
    return await this.doRequest(req);
  }

  async uploadCert(cert: string, key: string) {
    const req = {
      url: "/api/cert/cert/upload",
      method: "POST",
      data: {
        cert,
        key,
      },
    };
    return await this.doRequest(req);
  }

  /**
   * 部署证书到网站
   * @param certId 证书ID
   * @param websiteIds 网站ID列表
   * @param enableHttps 是否同时开启网站的HTTPS访问
   */
  async deployCert(certId: number, websiteIds: number[], enableHttps = true) {
    const req = {
      url: `/api/cert/cert/${certId}/deploy`,
      method: "POST",
      data: {
        id: certId,
        website_ids: websiteIds,
        enable_https: enableHttps,
      },
    };
    return await this.doRequest(req);
  }

  /**
   * 部署证书到单个网站（旧版面板接口）
   */
  async deployCertToWebsite(certId: number, websiteId: number) {
    const req = {
      url: `/api/cert/cert/${certId}/deploy`,
      method: "POST",
      data: {
        id: certId,
        website_id: websiteId,
      },
    };
    return await this.doRequest(req);
  }

  async getSystemInfo() {
    const req = {
      url: "/api/home/system_info",
      method: "GET",
    };
    return await this.doRequest(req);
  }

  /**
   * 获取面板版本号，获取失败时返回空字符串，按旧版本处理
   */
  async getPanelVersion(): Promise<string> {
    try {
      const res = await this.getSystemInfo();
      const panelVersion = res.data?.panel_version;
      if (!panelVersion) {
        return "";
      }
      return String(panelVersion);
    } catch (e: any) {
      this.logger.warn(`获取AcePanel版本失败，将使用旧版部署接口：${e.message}`);
      return "";
    }
  }

  /**
   * 面板版本大于等于3.3.2才支持通过website_ids批量部署
   */
  isBatchDeploySupported(panelVersion: string) {
    if (!panelVersion) {
      return false;
    }
    return compareVersion(panelVersion, "3.3.2") >= 0;
  }

  async updatePanelCert(cert: string, key: string) {
    const oldSettingRes = await this.doRequest({
      url: "/api/setting",
      method: "GET",
    });

    const oldSetting = oldSettingRes.data || {};
    const req = {
      url: "/api/setting",
      method: "POST",
      data: {
        ...oldSetting,
        acme: false,
        https: true,
        cert,
        key,
      },
    };
    return await this.doRequest(req);
  }
}

new AcePanelAccess();
