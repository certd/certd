import { AccessInput, BaseAccess, IsAccess } from "@certd/pipeline";
import { HttpRequestConfig, utils } from "@certd/basic";

/**
 * 这个注解将注册一个授权配置
 * 在certd的后台管理系统中，用户可以选择添加此类型的授权
 */
@IsAccess({
  name: "baotawaf",
  title: "宝塔云WAF授权",
  desc: "用于连接和管理宝塔云WAF服务的授权配置",
  icon: "svg:icon-bt",
})
export class BaotaWafAccess extends BaseAccess {
  @AccessInput({
    title: "在宝塔WAF URL",
    component: {
      placeholder: "http://192.168.42.237:41896",
    },
    helper: "在宝塔WAF的URL地址，不要带安全入口，例如：http://192.168.42.237:41896",
    required: true,
  })
  panelUrl = "";

  @AccessInput({
    title: "WAF API 密钥",
    component: {
      placeholder: "请输入WAF API接口密钥",
    },
    helper: "在宝塔WAF设置页面 - API接口中获取的API密钥。\n必须添加IP白名单，请确保已将CertD服务器IP加入白名单",
    required: true,
    encrypt: true,
  })
  apiSecret = "";

  @AccessInput({
    title: "忽略SSL证书校验",
    value: false,
    component: {
      name: "a-switch",
      vModel: "checked",
    },
    helper: "如果面板使用的是自签名SSL证书，则需要开启此选项",
  })
  skipSslVerify = false;

  @AccessInput({
    title: "测试",
    component: {
      name: "api-test",
      action: "onTestRequest",
    },
    helper: "点击测试WAF请求",
  })
  testRequest = true;

  async onTestRequest() {
    const body = {
      p: 1,
      p_size: 1,
      site_name: "",
    };
    // 发送测试请求
    await this.doRequest({
      url: "/api/wafmastersite/get_site_list",
      data: body,
    });
  }

  async getSiteList(req: { query?: string; pageNo?: number; pageSize?: number } = {}) {
    const body = {
      p: req.pageNo ?? 1,
      p_size: req.pageSize ?? 100,
      site_name: req.query ?? "",
    };
    return await this.doRequest({
      url: "/api/wafmastersite/get_site_list",
      data: body,
    });
  }

  async doRequest(req: HttpRequestConfig) {
    const http = this.ctx.http;

    let panelUrl = this.panelUrl;
    if (panelUrl.endsWith("/")) {
      panelUrl = panelUrl.substring(0, panelUrl.length - 1);
    }
    // 构建请求头
    /**
     * __WAF_KEY = 接口密钥 (在WAF设置页面 - API 接口中获取)
     * waf_request_time = 当前请求时间的 uinx 时间戳 ( php: time() / python: time.time() )
     * waf_request_token = md5(string(request_time) + md5(api_sk))
     */
    const timestamp = Math.floor(Date.now() / 1000);

    const token = utils.hash.md5(timestamp + utils.hash.md5(this.apiSecret));

    const headers = {
      waf_request_time: timestamp,
      waf_request_token: token,
      ...req.headers,
    };

    // 发送测试请求
    const response = await http.request({
      // https://192.168.182.201:8379/api/wafmastersite/get_site_list
      baseURL: panelUrl,
      method: "POST",
      data: req.data,
      skipSslVerify: this.skipSslVerify,
      ...req,
      headers: {
        ...headers,
      },
    });

    // 检查响应是否成功
    if (response && response.code === 0) {
      return response.res;
    } else {
      throw new Error(`请求失败: ${response.msg || "未知错误"}`);
    }
  }
}

// 实例化插件
new BaotaWafAccess();
