import crypto from "crypto-js";
import { HttpClient, HttpRequestConfig, ILogger, utils } from "@certd/basic";
import { Pager, PageSearch } from "@certd/pipeline";

export class XinnetClient {
  access = null;
  http = null;
  logger = null;

  xTickets = null;
  loginCookies = null;
  domainTokenCookie = null;

  userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0";

  constructor(opts: { access: { username: string; password: string }; logger: ILogger; http: HttpClient }) {
    this.access = opts.access;
    this.http = opts.http;
    this.logger = opts.logger;
  }

  async doRedirectRequest(conf: HttpRequestConfig) {
    let resRedirect = null;
    try {
      resRedirect = await this.http.request(conf);
    } catch (e) {
      resRedirect = e.response;
      this.logger.info(resRedirect.headers);
      if (!resRedirect) {
        throw new Error("请求失败:", e);
      }
    }
    return resRedirect;
  }

  getCookie(response: any) {
    const setCookie = response.headers["set-cookie"];
    if (!setCookie || setCookie.length === 0) {
      throw new Error("未获取到cookie", response);
    }
    return setCookie
      .map(item => {
        return item.split(";")[0];
      })
      .join(";");
  }

  async getToken() {
    const res = await this.http.request({
      url: "https://login.xinnet.com/queryUOne",
      method: "get",
    });
    this.logger.info("queryUOne", res.data);
    const { uOne, uTwo } = res.data;

    const res1 = await this.doRedirectRequest({
      url: "https://login.xinnet.com/newlogin",
      method: "get",
      headers: {
        Host: "login.xinnet.com",
        Origin: "https://login.xinnet.com",
        Referer: "https://login.xinnet.com/separatePage/?service=https://www.xinnet.com/",
      },
      maxRedirects: 0,
      withCredentials: true,
      returnOriginRes: true,
    });

    const cookie = this.getCookie(res1);
    this.logger.info("firstCookie", cookie);

    function encrypt(password, utwo) {
      // return "" + crypto.encrypt(password, utwo);
      return crypto.AES.encrypt(password, utwo).toString();
    }

    const data = {
      username: this.access.username,
      password: encrypt(this.access.password, uTwo),
      uOne: uOne,
      randStr: "",
      ticket: "",
      service: "",
      isRemoteLogin: false,
    };
    const formData = new FormData();
    for (const key in data) {
      formData.append(key, data[key]);
    }
    const res2 = await this.http.request({
      url: "https://login.xinnet.com/newlogin",
      method: "post",
      headers: {
        Origin: "https://login.xinnet.com",
        Referer: "https://login.xinnet.com/separatePage/?service=https://www.xinnet.com/",
        "Content-Type": "multipart/form-data",
        Cookie: cookie,
      },
      data: formData,
      withCredentials: true,
      returnOriginRes: true,
    });
    // console.log(res2.data);
    const loginedCookie = this.getCookie(res2);
    this.logger.info("登录成功，loginCookie：", loginedCookie);
    const tickets = res2.data.data.xTickets;
    this.logger.info("tickets：", tickets);

    this.xTickets = tickets;
    this.loginCookies = loginedCookie;

    const xticketArr = this.xTickets.split("###");
    // const ssoTiccket = xticketArr[0];
    const domainTicket = xticketArr[3];

    // "jsonp_" + (Math.floor(1e5 * Math.random()) * Date.now()).toString(16)
    const jsonp = "jsonp_" + (Math.floor(1e5 * Math.random()) * Date.now()).toString(16);

    const xtokenUrl = `https://domain.xinnet.com/domainsso/getXtoken?xticket=${domainTicket}&callback=${jsonp}`;
    console.log("getxtoken-------", xtokenUrl);
    const res4 = await this.doRedirectRequest({
      //    https://domain.xinnet.com/domainsso/getXtoken?xticket=gZNBBDObcyxKaQqRVDj&callback=jsonp_6227d9fe0004c4
      url: xtokenUrl,
      method: "get",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0",
        cookie: loginedCookie,
      },
      maxRedirects: 0,
      withCredentials: true,
      returnOriginRes: true,
    });

    const cookie4 = this.getCookie(res4);
    this.logger.info("获取domainXtoken成功:", cookie4);
    this.domainTokenCookie = cookie4;
  }

  async getDomainList(data: PageSearch): Promise<{ totalRows: number; list: { domainName: string; serviceCode: string }[] }> {
    if (!this.domainTokenCookie) {
      await this.getToken();
    }

    const pager = new Pager(data);
    const domainListUrl = "https://domain.xinnet.com/domainManage/domainList";

    const res = await this.doDomainRequest({
      url: domainListUrl,
      method: "post",
      data: {
        pageNo: pager.pageNo,
        pageSize: pager.pageSize,
        domainName: data.searchKey ?? "",
      },
    });
    return res;
  }

  async doDomainRequest(conf: HttpRequestConfig) {
    if (!this.domainTokenCookie) {
      await this.getToken();
    }
    const res = await this.http.request({
      url: conf.url,
      method: conf.method ?? "post",
      headers: {
        Host: "domain.xinnet.com",
        Origin: "https://domain.xinnet.com",
        Referer: "https://domain.xinnet.com/",
        "User-Agent": this.userAgent,
        cookie: this.domainTokenCookie,
      },
      data: conf.data,
      withCredentials: true,
    });
    return res;
  }

  async getDcpCookie(opts: { serviceCode: string }) {
    if (!this.domainTokenCookie) {
      await this.getToken();
    }
    const domainTokenCookie = this.domainTokenCookie;
    const serviceCode = opts.serviceCode;
    const redirectDcpUrl = "https://domain.xinnet.com/dcp?serviceCode=" + serviceCode + "&type=analytic";
    const res10 = await this.doRedirectRequest({
      url: redirectDcpUrl,
      method: "get",
      headers: {
        cookie: domainTokenCookie,
      },
      maxRedirects: 0,
      withCredentials: true,
      returnOriginRes: true,
    });

    const location = res10.headers["location"];
    console.log("跳转到dcp:", location);

    const resRedirect = await this.doRedirectRequest({
      url: location,
      method: "get",
      maxRedirects: 0,
      withCredentials: true,
      returnOriginRes: true,
    });

    const newCookie = this.getCookie(resRedirect);
    this.logger.info("dcpCookie", newCookie);
    return newCookie;
  }

  async getDomainDnsList(opts: { serviceCode: string; recordValue?: string; dcpCookie }) {
    const dnsListURL = "https://dcp.xinnet.com/dcp/domaincloudanalytic/list";
    const res = await this.http.request({
      url: dnsListURL,
      method: "post",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        Host: "dcp.xinnet.com",
        Origin: "https://dcp.xinnet.com",
        Referer: "https://dcp.xinnet.com/dcpProduct.html",
        cookie: opts.dcpCookie,
      },
      data: {
        type: "ALL",
        content: opts.recordValue || "",
        skip: 1,
        limit: 10,
      },
      withCredentials: true,
    });
    if (res.code != 0) {
      this.logger.error("获取DNS列表失败", JSON.stringify(res));
      throw new Error("获取DNS列表失败");
    }
    return res.data?.list;
  }

  async addDomainDnsRecord(req: { recordName: string; type: string; recordValue: string }, opts: { serviceCode: string; dcpCookie: string }) {
    const addDnsUrl = "https://dcp.xinnet.com/dcp/domaincloudanalytic/add";
    const addRes = await this.doDcpRequest(
      {
        url: addDnsUrl,
        method: "post",
        data: {
          recordName: req.recordName,
          type: req.type,
          content: req.recordValue,
          ttl: 600,
          phoneCode: 1,
        },
      },
      opts
    );
    this.logger.info(addRes);

    await utils.sleep(3000);

    const res = await this.getDomainDnsList({
      serviceCode: opts.serviceCode,
      recordValue: req.recordValue,
      dcpCookie: opts.dcpCookie,
    });
    // console.log(res.data);
    if (!res || res.length === 0) {
      throw new Error("未找到添加的DNS记录");
    }
    const item = res[0];
    return {
      recordId: item.id,
      recordFullName: item.name,
      recordValue: item.content,
      type: item.type,
    };
  }

  async deleteDomainDnsRecord(req: { recordId: number; recordFullName: string; type: string; recordValue: string }, opts: { serviceCode: string; dcpCookie }) {
    const delDnsUrl = "https://dcp.xinnet.com/dcp/domaincloudanalytic/delete";
    const res13 = await this.doDcpRequest(
      {
        url: delDnsUrl,
        method: "post",
        data: {
          recordId: req.recordId,
          recordName: req.recordFullName,
          content: req.recordValue,
          type: req.type,
          isBatch: 0,
          phoneCode: 1,
        },
      },
      opts
    );
    console.log(res13.data);
    return res13;
  }

  async doDcpRequest(req: HttpRequestConfig, opts: { serviceCode: string; dcpCookie: string }) {
    return await this.http.request({
      url: req.url,
      method: req.method ?? "post",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Host: "dcp.xinnet.com",
        Origin: "https://dcp.xinnet.com",
        Referer: "https://dcp.xinnet.com/dcpProduct.html",
        cookie: opts.dcpCookie,
      },
      withCredentials: true,
      data: req.data,
    });
  }
}
