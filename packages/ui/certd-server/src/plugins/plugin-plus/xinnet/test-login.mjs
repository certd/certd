import axios from "axios";
import crypto from "crypto-js";

function getCookie(res1) {
  let setCookie = res1.headers["set-cookie"];
  console.log(setCookie);
  let cookie = setCookie
    .map(item => {
      return item.split(";")[0];
    })
    .join(";");
  return cookie;
}

async function login() {
  const instance = axios.create({
    timeout: 3000, // 请求超时时间
    withCredentials: true,
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0" }, // 设置请求头
  });

  const res = await instance.get("https://login.xinnet.com/queryUOne");

  console.log(res.data?.data);
  const { uOne, uTwo } = res.data.data;

  let res1 = null;
  try {
    res1 = await instance.request({
      url: "https://login.xinnet.com/newlogin",
      method: "get",
      headers: {
        Host: "login.xinnet.com",
        Origin: "https://login.xinnet.com",
        Referer: "https://login.xinnet.com/separatePage/?service=https://www.xinnet.com/",
      },
      maxRedirects: 0,
      withCredentials: true,
    });
  } catch (e) {
    console.log(e.response.headers);
    res1 = e.response;
  }

  let cookie = getCookie(res1);

  function encrypt(password, utwo) {
    // return "" + crypto.encrypt(password, utwo);
    return crypto.AES.encrypt(password, utwo).toString();
  }

  const data = {
    username: 18603046467,
    password: encrypt("xxxxxxxxxxxxxpassword", uTwo),
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
  const res2 = await instance.request({
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
  });
  console.log(res2.data);
  let loginedCookie = getCookie(res2);
  console.log("loginCookie", loginedCookie);

  const tickets = res2.data.data.xTickets;

  const xticketArr = tickets.split("###");
  const ssoTiccket = xticketArr[0];
  const domainTicket = xticketArr[3];

  // "jsonp_" + (Math.floor(1e5 * Math.random()) * Date.now()).toString(16)
  const jsonp = "jsonp_" + (Math.floor(1e5 * Math.random()) * Date.now()).toString(16);

  // const ssoUrl = `https://www.xinnet.com/sso/getXtoken?xticket=${ssoTiccket}&callback=${jsonp}`;
  // const res3 = await axios.request({
  //   url: ssoUrl,
  //   method: "get",
  //   headers: {
  //     Host: "www.xinnet.com",
  //     Origin: "https://login.xinnet.com",
  //     Referer: "https://login.xinnet.com/separatePage/?service=https://www.xinnet.com/",
  //     "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/}"
  //   },
  //   cookie:loginedCookie,
  //   maxRedirects: 0,
  //   withCredentials: true
  // });
  //
  // console.log(res3.data);
  // let cookie2 = getCookie(res3);
  // console.log(cookie2);

  let res4 = null;
  try {
    const xtokenUrl = `https://domain.xinnet.com/domainsso/getXtoken?xticket=${domainTicket}&callback=${jsonp}`;
    console.log("getxtoken-------", xtokenUrl);
    res4 = await instance.request({
      //    https://domain.xinnet.com/domainsso/getXtoken?xticket=gZNBBDObcyxKaQqRVDj&callback=jsonp_6227d9fe0004c4
      url: xtokenUrl,
      method: "get",
      headers: {
        /**
         * Host:
         * ssl.xinnet.com
         * Referer:
         * https://login.xinnet.com/separatePage/?service=https://www.xinnet.com/
         */
        // Host: "ssl.xinnet.com",
        // Referer: "https://login.xinnet.com/separatePage/?service=https://www.xinnet.com/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0",
        cookie: loginedCookie,
      },
      maxRedirects: 0,
      withCredentials: true,
    });
  } catch (e) {
    res4 = e.response;
    console.log(res4.headers);
  }
  console.log(res4.data);
  let domainTokenCookie = getCookie(res4);
  console.log("domainTokenCookie", domainTokenCookie);

  //
  // let res8 = null;
  // const consoleXtokenUrl = `https://console.xinnet.com/sso/getXtoken?xticket=${domainTicket}&callback=${jsonp}`;
  // console.log("getConsolextoken-------", consoleXtokenUrl);
  // res8 = await instance.request({
  //   //    https://domain.xinnet.com/domainsso/getXtoken?xticket=gZNBBDObcyxKaQqRVDj&callback=jsonp_6227d9fe0004c4
  //   url: consoleXtokenUrl,
  //   method: "get",
  //   headers: {
  //     "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0",
  //     cookie: loginedCookie
  //   },
  //   maxRedirects: 0,
  //   withCredentials: true
  // });
  //
  // console.log(res8.data);
  // let consoleTokenCookie = getCookie(res8);
  // console.log("consoleTokenCookie", consoleTokenCookie);

  // const consoleIdUrl = "https://console.xinnet.com/usercommon/getShopcartNum";
  //
  // const res7 = await instance.request({
  //   url: consoleIdUrl,
  //   method: "get",
  //   headers: {
  //     Host: "console.xinnet.com",
  //     Referer: "https://domain.xinnet.com/",
  //     cookie: consoleTokenCookie +";"+ loginedCookie
  //   }
  // });
  // console.log(res7.data);
  // let consoleIdCookie = getCookie(res7);
  // console.log("consoleIdCookie",consoleIdCookie);

  const domainListUrl = "https://domain.xinnet.com/domainManage/domainList";

  const res5 = await instance.request({
    url: domainListUrl,
    method: "post",
    headers: {
      /**
       * Host:
       * domain.xinnet.com
       * Origin:
       * https://domain.xinnet.com
       * Referer:
       * https://domain.xinnet.com/
       */
      Host: "domain.xinnet.com",
      Origin: "https://domain.xinnet.com",
      Referer: "https://domain.xinnet.com/",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0",
      cookie: domainTokenCookie,
    },
    data: {
      /**
       * pageNo: 1
       * pageSize: 10
       * orderByProperty: expire_date
       * orderByType: asc
       */
      pageNo: 1,
      pageSize: 10,
    },
    withCredentials: true,
  });
  console.log(res5.data);

  // const bindUrls = [
  //   "https://domain.xinnet.com/domainManage/inspectDomainRealname",
  //   "https://domain.xinnet.com/domainManage/inspectDomainBindPhone",
  //   "https://domain.xinnet.com/domainManage/inspectDomainXinnetDns",
  //   "https://domain.xinnet.com/domainManage/inspectDomainEvents"
  // ];
  // const consoleIdCookie = consoleTokenCookie.split(";")[0];
  // for (const url of bindUrls) {
  //   console.log("do bind:", url);
  //   const cookie1 = consoleIdCookie + ";" + domainTokenCookie;
  //   console.log("cookie1", cookie1);
  //   const res9 = await instance.request({
  //     url: url,
  //     method: "post",
  //     headers: {
  //       "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
  //       Host: "domain.xinnet.com",
  //       Origin: "https://domain.xinnet.com",
  //       Referer: "https://domain.xinnet.com",
  //       cookie: cookie1
  //     },
  //     data: {
  //       domainName: "ulogin.top"
  //     },
  //     withCredentials: true
  //   });
  //   console.log(res9.data);
  // }

  const serviceCode = "D76534287817377";
  const redirectDcpUrl = "https://domain.xinnet.com/dcp?serviceCode=" + serviceCode + "&type=analytic";
  let res10 = null;
  try {
    res10 = await instance.request({
      url: redirectDcpUrl,
      method: "get",
      headers: {
        cookie: domainTokenCookie,
      },
      maxRedirects: 0,
      withCredentials: true,
    });
  } catch (e) {
    res10 = e.response;
    console.log(res10.headers);
  }
  const location = res10.headers["location"];
  console.log("跳转到dcp:", location);

  let resRedirect = null;
  try {
    resRedirect = await instance.request({
      url: location,
      method: "get",
      maxRedirects: 0,
      withCredentials: true,
    });
  } catch (e) {
    resRedirect = e.response;
    console.log(resRedirect.headers);
  }

  const newCookie = getCookie(resRedirect);
  console.log("newCookie", newCookie);

  const dnsListURL = "https://dcp.xinnet.com/dcp/domaincloudanalytic/list";
  const res11 = await instance.request({
    url: dnsListURL,
    method: "post",
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      Host: "dcp.xinnet.com",
      Origin: "https://dcp.xinnet.com",
      Referer: "https://dcp.xinnet.com/dcpProduct.html",
      cookie: newCookie,
    },
    data: {
      type: "ALL",
      content: "",
      skip: 1,
      limit: 10,
    },
    withCredentials: true,
  });
  console.log(res11.data);

  //add dns
  // const addDnsUrl =   "https://dcp.xinnet.com/dcp/domaincloudanalytic/add"
  // const res12 = await instance.request({
  //   url: addDnsUrl,
  //   method: "post",
  //   headers: {
  //     "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
  //     Host: "dcp.xinnet.com",
  //     Origin: "https://dcp.xinnet.com",
  //     Referer: "https://dcp.xinnet.com/dcpProduct.html",
  //     cookie: newCookie
  //   },
  //   data: {
  //     recordName: "343533",
  //     type: "TXT",
  //     content: "456456",
  //     ttl: 600,
  //     phoneCode: 1,
  //   }
  // })
  // console.log(res12.data);
  //
  // const delDnsUrl = "https://dcp.xinnet.com/dcp/domaincloudanalytic/delete"
  //
  // const res13 = await instance.request({
  //   url: delDnsUrl,
  //   method: "post",
  //   headers: {
  //     "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
  //     Host: "dcp.xinnet.com",
  //     Origin: "https://dcp.xinnet.com",
  //     Referer: "https://dcp.xinnet.com/dcpProduct.html",
  //     cookie: newCookie
  //   },
  //   data:{
  //     recordId: 167529045,
  //     recordName: "aaaa.ulogin.top",
  //     content: "aaaa",
  //     type: "TXT",
  //     isBatch: 0,
  //     phoneCode: 1,
  //   }
  // })
  // console.log(res13.data);
}

login();
