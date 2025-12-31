import { HttpClient, ILogger } from "@certd/basic";
import * as querystring from "node:querystring";
import { CtyunAccess } from "./access/ctyun-access.js";
export type CtyunCdnDomainInfo = {
  area_scope: number;
  insert_date: number;
  domain: string;
  cname: string;
  record_num: string;
  product_code: string;
  product_name: string;
  status: number;
};
export type CtyunClientOptions = {
  access: CtyunAccess;
  logger: ILogger;
  http: HttpClient;
};

export class CtyunClient {
  opts: CtyunClientOptions;
  access: CtyunAccess;

  constructor(opts: CtyunClientOptions) {
    this.opts = opts;
    this.access = opts.access;
  }

  encode(str) {
    return Buffer.from(str, "utf-8").toString("base64");
  }

  // 解码
  decode(str) {
    return Buffer.from(str, "base64").toString("utf-8");
  }

  // 用 - 和 _ 来代替 + 和 / ，以适应URL中的传输
  urlEncode(str) {
    const encoded = this.encode(str);
    return encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  urlDecode(str) {
    str = str.replace(/-/g, "+").replace(/_/g, "/");
    // 补全字符数为4的整数
    while (str.length % 4) {
      str += "=";
    }
    return this.decode(str);
  }

  async hmacsha256(content, key) {
    const crypto = await import("crypto");
    const h = crypto.createHmac("sha256", Buffer.from(key, "base64")).update(content).digest();
    return this.urlEncode(h);
  }

  async getHeader(uri) {
    // AK
    const AK = this.access.accessKeyId;
    // SK
    const SK = this.access.securityKey;

    const dateNow = +new Date();
    const content = AK + "\n" + dateNow + "\n" + uri;
    const authorizedKey = await this.hmacsha256(AK + ":" + parseInt(String(dateNow / 86400000)), SK);
    const signature = await this.hmacsha256(content, authorizedKey);

    return {
      "x-alogic-now": dateNow,
      "x-alogic-app": AK,
      "x-alogic-signature": signature, // 对本次调用信息的签名
      "x-alogic-ac": "app", // 访问控制器id，取固定值app
    };
  }

  /**
   * 接口描述：调用本接口创建证书。
   * 请求方式：post
   * 请求路径：/v1/cert/create
   * 使用说明： 单个用户一分钟限制调用10000次，并发不超过100；
   *
   * 请求参数说明：
   *
   * 参数	类型	是否必传	名称	描述
   * name	string	是	证书备注名
   * key	string	是	证书私钥	仅支持PEM格式
   * certs	string	是	证书公钥	仅支持PEM格式
   * email	string	否	用户邮箱
   * 返回参数说明：
   *
   * 参数	类型	是否必传	名称及描述
   * code	int	是	状态码
   * message	string	是	描述信息
   * id	int	是	证书id
   * 示例：
   * 请求路径：https://open.ctcdn.cn/api/v1/cert/create
   *
   * 示例1：
   * 请求参数：
   *
   * {
   *     "name": "xxxx",
   *     "certs": "xxxxx",
   *     "key": "xxxxxx"
   * }
   *
   * 返回结果：
   *
   * {
   *     "code": 100000,
   *     "message": "success",
   *     "id": 7028
   * }
   */
  async doRequest({ uri, method, data }: any) {
    const http = this.opts.http;

    const body: any = {};
    if (method === "get") {
      if (data) {
        uri = uri + "?" + querystring.stringify(data);
      }
    } else {
      body.data = data;
    }
    const header = await this.getHeader(uri);

    const url = "https://open.ctcdn.cn" + uri;

    const res = await http.request({
      url,
      method,
      ...body,
      headers: {
        ...header,
        "Content-Type": "application/json",
      },
    });
    if (res.code !== 100000) {
      throw new Error(`请求失败:${res.message}`);
    }
    return res;
  }

  async certCreate(name: string, crt: string, key: string) {
    const uri = "/v1/cert/create";
    const method = "post";
    const data = {
      name,
      key,
      certs: crt,
    };
    return this.doRequest({ uri, method, data });
  }

  /**
   * 接口描述：调用本接口查询域名列表及域名的基础信息
   * 请求方式：get
   * 请求路径：/v2/domain/query
   * 使用说明：
   *
   * 新建的域名需要配置部署完毕（预计10分钟），本接口才能查询到
   * 单个用户一分钟限制调用10000次，并发不超过10
   * 请求参数说明：
   *
   * 参数
   * 类型
   * 是否必填
   * 名称
   * 说明
   * access_mode	int	否	接入方式	枚举值：1（域名接入方式），2（无域名接入方式），不传默认1
   * domain	string	否	域名	域名，不填默认所有域名
   * instance	string	否	实例名称	不超过10个字的中/英文/数字组合；当access_mode=2时，必填
   * product_code	string	否	产品类型	支持产品类型：“001”(静态加速)，“003”(下载加速),“004”(视频点播加速),“008”(CDN加速),“007”(安全加速),“005”(直播加速),“006”(全站加速),“009”(应用加速),“010”(web应用防火墙（边缘云版）),“011”(高防DDoS（边缘云版）),“014”（下载加速闲时）,“020”（边缘安全加速）,“024”（边缘接入），不填默认所有产品
   * status	int	否	域名状态	枚举值：4（已启用），6（已停止）；不填默认所有状态
   * area_scope	int	否	加速范围	1（国内）；2（海外）；3（全球），不填默认所有加速范围
   * page	int	否	页码	不填默认1
   * page_size	int	否	每页条数	不填默认50，最大100
   * 返回参数说明：
   *
   * 参数	类型	是否必传	名称及描述
   * code	int	是	状态码
   * message	string	是	描述信息
   * total	int	否	查询结果总条数
   * total_count	int	否	查询结果总条数
   * page	int	否	当前页数
   * page_size	int	否	每页条数
   * page_count	int	否	查询结果总页数
   * result	list<object>	否	返回结果列表
   * result[*].domain	string	否	域名
   * result[*].cname	string	否	cname
   * result[*].product_code	string	否	产品类型
   * result[*].product_name	string	否	产品名称
   * result[*].status	int	否	域名状态
   * result[*].insert_date	int	否	域名创建时间,单位毫秒
   * result[*].area_scope	int	否	加速范围
   * result[*].record_num	string	否	备案号
   * 示例：
   * 请求路径：https://open.ctcdn.cn/api/v2/domain/query
   *
   * 示例1：https://open.ctcdn.cn/api/v2/domain/query?page=1&page_size=2
   * 返回结果：
   *
   * {
   *     "code": 100000,
   *     "message": "success",
   *     "total": 52,
   *     "total_count": 52,
   *     "page": 1,
   *     "page_count": 26,
   *     "page_size": 2,
   *     "result": [
   *         {
   *             "area_scope": 1,
   *             "insert_date": 1667882163000,
   *             "domain": "sd54sdhmytest.baidu.ctyun.cn",
   *             "cname": "sd54sdhmytest.baidu.ctyun.cn.ctadns.cn.",
   *             "record_num": "京ICP证030173号-1",
   *             "product_code": "008",
   *             "product_name": "CDN加速",
   *             "status": 4
   *         },
   *         {
   *             "area_scope": 1,
   *             "insert_date": 1666765345000,
   *             "domain": "sd54sd.baidu.ctyun.cn",
   *             "cname": "sd54sd.baidu.ctyun.cn.ctadns.cn.",
   *             "record_num": "京ICP证030173号-1",
   *             "product_code": "008",
   *             "product_name": "CDN加速",
   *             "status": 6
   *         }
   *     ]
   * }
   * @param cert_list
   */
  async getDomainList({ productCode }: any): Promise<CtyunCdnDomainInfo[]> {
    const uri = "/v2/domain/query";
    const method = "get";
    const data = {
      product_code: productCode,
      page_size: 100,
    };
    const res = await this.doRequest({ uri, method, data });
    return res.result;
  }
}
