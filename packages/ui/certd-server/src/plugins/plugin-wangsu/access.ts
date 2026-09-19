import { AccessInput, BaseAccess, IsAccess } from "@certd/pipeline";
import { HttpRequestConfig } from "@certd/basic";
import { CertInfo } from "@certd/plugin-cert";
import * as crypto from "node:crypto";

/** 网宿开放接口域名：老接口与 CDN Pro 接口同域名，仅鉴权方式与路径不同 */
const WANGSU_API_URL = "https://open.chinanetcenter.com";

/** 鉴权方式：aksk（老接口签名，历史数据默认值）、apikey（CDN Pro 的 HTTP Basic） */
const AUTH_TYPE_AKSK = "aksk";
const AUTH_TYPE_APIKEY = "apikey";

/** 鉴权方式在界面上的名称，用于报错时告诉用户该选哪一种 */
const AUTH_TYPE_TITLE_APIKEY = "ApiKey";

/**
 * 网宿请求参数。
 * dateStr：本次请求要用的 RFC1123 Date。CDN Pro 的请求体里如果有用
 * encryptPrivateKey 加密的私钥，必须把加密时返回的 dateStr 传进来，
 * 否则私钥是按另一个 Date 派生的 Key/IV 加密的，服务端解不开。
 */
export type WangsuRequestConfig = HttpRequestConfig & {
  dateStr?: string;
};

/**
 * 生成「按鉴权方式显隐字段」的 mergeScript。
 *
 * 这里只负责把条件拼成脚本字符串，不判断 authType 是什么，也不决定显隐；
 * 真正的判断发生在浏览器里 ctx.compute 的回调内：回调依赖 form.access.authType，
 * 用户切换鉴权方式时会重新计算并刷新字段显隐。
 * 在 node 侧判断 authType 是没用的：那时表单还没打开，拿不到用户选的值。
 * 授权表单里字段值都在 form.access 下（与 google、cdnfly 等授权插件写法一致）。
 */
function visibleWhen(condition: string) {
  return `
    return {
      show: ctx.compute(({form})=>{
        return ${condition};
      })
    }
    `;
}

/** AccessKey 方式的条件：历史授权没有 authType 字段，按默认的 aksk 显示，保证老授权还能编辑保存 */
const CONDITION_AKSK = `!form.access.authType || form.access.authType === '${AUTH_TYPE_AKSK}'`;

/** ApiKey（CDN Pro）方式的条件 */
const CONDITION_APIKEY = `form.access.authType === '${AUTH_TYPE_APIKEY}'`;

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
    title: "鉴权方式",
    value: AUTH_TYPE_AKSK,
    component: {
      name: "a-select",
      vModel: "value",
      allowClear: false,
      options: [
        { label: "AccessKey签名", value: AUTH_TYPE_AKSK },
        { label: "ApiKey（CDN Pro必须用这个）", value: AUTH_TYPE_APIKEY },
      ],
    },
    helper: "网宿接口鉴权方式",
    // 不加 required，避免历史数据（没有该字段）在保存时被前端表单拦下；代码里判空回退到 aksk
    required: false,
  })
  authType?: string;

  @AccessInput({
    title: "accessKeyId",
    component: {
      name: "a-input",
      vModel: "value",
      placeholder: "accessKeyId",
    },
    helper: "[点击前往获取AccessKey](https://console.wangsu.com/account/accessKey?rsr=ws)",
    encrypt: false,
    required: true,
    mergeScript: visibleWhen(CONDITION_AKSK),
  })
  accessKeyId!: string;

  @AccessInput({
    title: "accessKeySecret",
    component: {
      name: "a-input",
      vModel: "value",
      placeholder: "accessKeySecret",
    },
    encrypt: true,
    required: true,
    mergeScript: visibleWhen(CONDITION_AKSK),
  })
  accessKeySecret!: string;

  @AccessInput({
    title: "API账号名",
    component: {
      name: "a-input",
      vModel: "value",
      placeholder: "API账号名",
    },
    helper: "控制台里的 API 账号名，与 API Key 配套使用",
    encrypt: false,
    required: false,
    mergeScript: visibleWhen(CONDITION_APIKEY),
  })
  apiUser = "";

  @AccessInput({
    title: "API Key",
    component: {
      name: "a-input",
      vModel: "value",
      placeholder: "API Key",
    },
    helper: "控制台里的 API Key，[点击前往获取](https://console.wangsu.com/account/apiManage)",
    encrypt: true,
    required: false,
    mergeScript: visibleWhen(CONDITION_APIKEY),
  })
  apiKey = "";

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

  /** 是否使用 CDN Pro 的 ApiKey（HTTP Basic）鉴权；历史数据没有该字段时回退到 aksk */
  isApiKeyAuth() {
    return this.authType === AUTH_TYPE_APIKEY;
  }

  /**
   * 调用 ApiKey 方式的接口（CDN Pro 请求、私钥加密）前，先确认当前授权选的就是 ApiKey 方式。
   * 这里只做技术前置校验：没选对方式就没有 API Key 可用，方法本身无法继续。
   * 「CDN Pro 必须用 ApiKey」这条业务规则由调用方（CDN Pro 部署插件）判断，不在授权里体现。
   */
  requireApiKeyAuth() {
    if (this.isApiKeyAuth()) {
      return;
    }
    throw new Error(`当前授权未选择「${AUTH_TYPE_TITLE_APIKEY}」鉴权方式，请在授权里选择该方式并填写 API 账号名与 API Key`);
  }

  /**
   * 取 ApiKey 方式要用的凭据。
   * 优先取 ApiKey 专属字段 apiUser/apiKey；历史数据没有这两个字段时，回退到老的 accessKeyId/accessKeySecret。
   */
  private resolveApiKeyAuth() {
    if (this.apiUser && this.apiKey) {
      return { apiUser: this.apiUser, apiKey: this.apiKey };
    }
    if (this.accessKeyId && this.accessKeySecret) {
      return { apiUser: this.accessKeyId, apiKey: this.accessKeySecret };
    }
    return { apiUser: "", apiKey: "" };
  }

  /**
   * 校验并返回 ApiKey 凭据，缺少凭据时直接报错。
   * 请求鉴权与私钥加密都必须用同一份凭据，所以统一从这里取。
   */
  private requireApiKeyAuthWithCredential() {
    this.requireApiKeyAuth();
    const credential = this.resolveApiKeyAuth();
    if (!credential.apiUser || !credential.apiKey) {
      throw new Error(`网宿授权中缺少 CDN Pro 的 API 账号名或 API Key，请在授权中选择「${AUTH_TYPE_TITLE_APIKEY}」并填写这两个字段`);
    }
    return credential;
  }

  /**
   * 加密 PEM 私钥，供 CDN Pro 更新证书接口使用。
   * 返回值里的 dateStr 必须作为该请求的 dateStr 传给 doRequest，请求鉴权与私钥加密要用同一个 Date，
   * 否则服务端会用另一个 Date 派生 Key/IV，私钥解不开。每张证书要单独调用一次，不要复用加密结果。
   * 派生规则与网宿官方示例一致：
   *   aesivkey = HMAC-SHA256(API_KEY, DATE) 十六进制
   *   IV = aesivkey 前 32 个十六进制字符，Key = 后 32 个
   */
  encryptPrivateKey(privateKey: string) {
    const { apiKey } = this.requireApiKeyAuthWithCredential();
    const dateStr = this.buildRfc1123Date(new Date());
    const hexKey = crypto.createHmac("sha256", apiKey).update(dateStr).digest("hex");
    const iv = Buffer.from(hexKey.substring(0, 32), "hex");
    const key = Buffer.from(hexKey.substring(32, 64), "hex");
    const cipher = crypto.createCipheriv("aes-128-cbc", key, iv);
    const encrypted = Buffer.concat([cipher.update(privateKey, "utf8"), cipher.final()]);
    return {
      privateKey: encrypted.toString("base64"),
      dateStr,
    };
  }

  async getCertList(req: Record<string, never>) {
    if (this.isApiKeyAuth()) {
      // CDN Pro 证书列表，limit 上限 200
      const res: any = await this.doRequest({
        url: "/cdn/certificates?limit=200",
        method: "GET",
      });
      const body = res.data;
      if (body == null) {
        return [];
      }
      return body.certificates || [];
    }

    /**
     * certificate-id
     * name
     * dns-names
     */
    const res: any = await this.doRequest({
      url: "/api/ssl/certificate",
      method: "GET",
    });

    return res.data["ssl-certificate"];
  }

  async getCertInfo(req: { certId: string }) {
    const res: any = await this.doRequest({
      url: `/api/certificate/${req.certId}`,
      method: "GET",
    });
    return res.data;
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

  async doRequest(req: WangsuRequestConfig) {
    if (this.isApiKeyAuth()) {
      return await this.doApiKeyRequest(req);
    }
    return await this.doAkSkRequest(req);
  }

  /** 老接口：使用 CNC-HMAC-SHA256 签名（AccessKeyId + AccessKeySecret） */
  private async doAkSkRequest(req: HttpRequestConfig) {
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
    // 与 apikey 方式统一：返回 {data,status,headers}，调用方统一取 .data 拿响应体
    return {
      data: response.data != null && response.code !== null ? response.data : response,
      status: 200,
      headers: null,
    };
  }

  /**
   * CDN Pro 接口：使用 HTTP Basic 鉴权
   * password = Base64(HMAC-SHA1(API_KEY, Date))，Date 为 RFC1123 格式的 GMT 时间
   */
  private async doApiKeyRequest(req: WangsuRequestConfig) {
    const { apiUser, apiKey } = this.requireApiKeyAuthWithCredential();

    // 调用方带了请求体私钥的加密 Date 时必须复用，否则服务端解不开私钥
    let dateStr = req.dateStr;
    if (!dateStr) {
      dateStr = this.buildRfc1123Date(new Date());
    }
    const headers = {
      Date: dateStr,
      Authorization: this.buildBasicAuthHeader(apiUser, apiKey, dateStr),
      Accept: "application/json",
      ...req.headers,
    };

    let res = undefined;
    try {
      res = await this.ctx.http.request({
        method: req.method,
        url: `${WANGSU_API_URL}${req.url}`,
        headers,
        data: req.data,
        // 需要原始响应，才能拿到状态码与 Location 响应头
        returnOriginRes: true,
      });
    } catch (e) {
      throw new Error(`网宿接口请求失败：${this.formatError(e)}`);
    }

    // returnOriginRes 生效时返回的是原始响应对象；未生效时兼容直接返回响应体的情况
    if (res.status == null) {
      return { data: res, status: 200, headers: null };
    }
    const status = Number(res.status);
    if (status < 200 || status >= 300) {
      throw new Error(`网宿接口返回异常：${this.formatBody(res.data, status)}`);
    }
    // 返回原始响应，调用方才能读到 Location 等响应头（部署更新证书要靠它拿新版本号）
    return res;
  }

  /** 生成 RFC1123 格式的 GMT 时间字符串，例如：Sat, 19 Sep 2026 14:20:02 GMT */
  private buildRfc1123Date(date: Date) {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const parts: Record<string, string> = {};
    for (const item of formatter.formatToParts(date)) {
      parts[item.type] = item.value;
    }
    // 部分运行时在午夜会输出 24 点，需要归一到 00
    let hour = parts.hour;
    if (hour === "24") {
      hour = "00";
    }
    return `${parts.weekday}, ${parts.day} ${parts.month} ${parts.year} ${hour}:${parts.minute}:${parts.second} GMT`;
  }

  /** 生成 HTTP Basic 鉴权头，password = Base64(HMAC-SHA1(API_KEY, Date)) */
  private buildBasicAuthHeader(apiUser: string, apiKey: string, dateStr: string) {
    const password = crypto.createHmac("sha1", apiKey).update(dateStr).digest("base64");
    const raw = Buffer.from(`${apiUser}:${password}`, "utf8").toString("base64");
    return `Basic ${raw}`;
  }

  /** 格式化接口返回的错误内容，兼容 JSON、XML 与已解析成对象三种错误体 */
  private formatBody(body: any, status: number | null) {
    let suffix = "";
    if (status != null) {
      suffix = `（HTTP ${status}）`;
    }
    if (body == null || body === "") {
      return `响应内容为空${suffix}`;
    }
    if (typeof body === "object") {
      let code = "";
      if (body.code) {
        code = `[${body.code}] `;
      }
      const message = body.message || body.msg || body.result || JSON.stringify(body);
      return `${code}${message}${suffix}`;
    }
    const text = String(body);
    const codeMatched = text.match(/<code>([\s\S]*?)<\/code>/);
    const msgMatched = text.match(/<message>([\s\S]*?)<\/message>/);
    if (codeMatched || msgMatched) {
      let code = "";
      if (codeMatched) {
        code = `[${codeMatched[1].trim()}] `;
      }
      let message = text;
      if (msgMatched) {
        message = msgMatched[1].trim();
      }
      return `${code}${message}${suffix}`;
    }
    return `${text}${suffix}`;
  }

  /** 提取异常中的状态码与响应内容，尽量给用户可读的提示 */
  private formatError(e: any) {
    if (!e) {
      return "未知错误";
    }
    const status = this.readErrorStatus(e);
    const body = this.readErrorBody(e);
    if (body != null) {
      return this.formatBody(body, status);
    }
    if (status != null && e.message) {
      return `${e.message}（HTTP ${status}）`;
    }
    if (e.message) {
      return e.message;
    }
    return String(e);
  }

  /** 从异常中取 HTTP 状态码，兼容包装后的异常与 axios 原始异常 */
  private readErrorStatus(e: any) {
    if (e.status != null) {
      return e.status;
    }
    if (e.response && e.response.status != null) {
      return e.response.status;
    }
    return null;
  }

  /** 从异常中取响应体 */
  private readErrorBody(e: any) {
    if (e.response && e.response.data != null) {
      return e.response.data;
    }
    return null;
  }
}

new WangsuAccess();
