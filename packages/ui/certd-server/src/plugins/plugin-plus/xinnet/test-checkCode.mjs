import axios from "axios";
import crypto from "crypto-js";
import https from "https";
import qs from "qs";

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
  const httpsAgent = new https.Agent({
    rejectUnauthorized: false, // 这里可以设置为 false 来忽略 SSL 证书验证
  });
  const instance = axios.create({
    timeout: 3000, // 请求超时时间
    withCredentials: true,
    httpsAgent,
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0" }, // 设置请求头
  });

  //
  // const res = await instance.get("https://login.xinnet.com/queryUOne");
  //
  // console.log(res.data?.data);
  // const { uOne, uTwo } = res.data.data;

  let res1 = null;
  try {
    res1 = await instance.request({
      url: "https://dcp.xinnet.com/",
      method: "get",
      headers: {},
      maxRedirects: 0,
      withCredentials: true,
    });
  } catch (e) {
    console.log(e.response.headers);
    res1 = e.response;
  }

  let cookie = getCookie(res1);

  console.log(cookie);

  function encrypt(password, secret) {
    // return "" + crypto.encrypt(password, utwo);
    return crypto.AES.encrypt(password, secret).toString();
  }

  const codeGetUrl = "https://dcp.xinnet.com/domain/getValidatePic";

  const res2 = await instance.request({
    url: codeGetUrl,
    method: "get",
    responseType: "arraybuffer",
    headers: {
      "Content-Type": "application/json;charset=utf-8",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0",
      Host: "dcp.xinnet.com",
      cookie: cookie,
    },
    // maxRedirects: 0,
    withCredentials: true,
  });
  console.log("status:", res2.status);
  const imageData = res2.data;
  let imageBuffer = Buffer.from(imageData, "binary");

  const res3 = await axios.request({
    url: "https://ocr.com/ocr",
    method: "post",
    headers: {
      Authorization: "Basic " + Buffer.from("username:password").toString("base64"),
    },
    httpsAgent,
    data: {
      image: imageBuffer.toString("base64"),
    },
  });

  console.log(res3.data.result.ocr_response);
  let text = res3.data.result.ocr_response.map(item => item.text.trim()).join("");
  text = text.replaceAll(" ", "");
  console.log(text);

  const url = "https://dcp.xinnet.com/domain/validEnter";
  const password = encrypt("jidian1zu", "this is temp before https");
  // const body =  {
  //   domainName: "ulogin.top",
  //   password: encodeURIComponent(password),
  //   checkCode: encodeURIComponent( text),
  // }
  const body = {
    domainName: "ulogin.top",
    password: password,
    checkCode: text,
  };
  const query = qs.stringify(body);
  console.log(query);
  const res4 = await instance.request({
    url: url,
    method: "post",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      // cookie: cookie,
      Host: "dcp.xinnet.com",
      Origin: "https://dcp.xinnet.com",
      Referer: "https://dcp.xinnet.com/",
      cookie: cookie,
    },
    data: body,
    withCredentials: true,
  });
  console.log(res4.data);

  const domainEnterUrl = "https://dcp.xinnet.com/domain/domainEnter";
  const res6 = await instance.request({
    url: domainEnterUrl,
    method: "post",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Host: "dcp.xinnet.com",
      Origin: "https://dcp.xinnet.com",
      Referer: "https://dcp.xinnet.com/",
      cookie: cookie,
    },
    data: body,
    withCredentials: true,
  });

  console.log(res6.data);

  const listUrl = "https://dcp.xinnet.com/dcp/domaincloudanalytic/list";
  const res5 = await instance.request({
    url: listUrl,
    method: "post",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Host: "dcp.xinnet.com",
      Origin: "https://dcp.xinnet.com",
      Referer: "https://dcp.xinnet.com/dcpProduct.html",
      cookie: cookie,
    },
    withCredentials: true,
    data: {
      type: "ALL",
      content: "",
      limit: 10,
    },
  });
  console.log(res5.data);
}

login();
