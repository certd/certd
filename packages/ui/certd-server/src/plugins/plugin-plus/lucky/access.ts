import { IsAccess, AccessInput, BaseAccess } from "@certd/pipeline";

/**
 * 这个注解将注册一个授权配置
 * 在certd的后台管理系统中，用户可以选择添加此类型的授权
 */
@IsAccess({
  name: "lucky",
  title: "lucky",
  desc: "",
  icon: "svg:icon-lucky",
})
export class LuckyAccess extends BaseAccess {
  /**
   * 授权属性配置
   */
  @AccessInput({
    title: "访问url",
    component: {
      placeholder: "http://xxx.xx.xx:16301",
    },
    helper: "不要带安全入口",
    required: true,
    encrypt: false,
  })
  url = "";

  @AccessInput({
    title: "安全入口",
    component: {
      placeholder: "/your_safe_path",
    },
    helper: "请参考lucky设置中关于安全入口的配置，",
    required: false,
    encrypt: true,
  })
  safePath = "";

  /**
   * 授权属性配置
   */
  @AccessInput({
    title: "OpenToken",
    component: {
      placeholder: "OpenToken",
    },
    helper: "设置->最下面开发者设置->启用OpenToken",
    required: true,
    encrypt: true,
  })
  openToken = "";

  @AccessInput({
    title: "测试",
    component: {
      name: "api-test",
      action: "TestRequest",
    },
    helper: "点击测试接口看是否正常",
  })
  testRequest = true;

  async onTestRequest() {
    await this.getCertList();
    return "ok";
  }

  async doRequest(req: { urlPath: string; data: any; method?: string }) {
    const { urlPath, data, method } = req;
    let url = `${this.url}/${this.safePath || ""}${urlPath}?_=${Math.floor(new Date().getTime())}`;
    // 从第7个字符起，将//替换成/
    const protocol = url.substring(0, 7);
    let suffix = url.substring(7);
    suffix = suffix.replaceAll("//", "/");
    suffix = suffix.replaceAll("//", "/");
    url = protocol + suffix;

    const headers: any = {
      // Origin: access.url,
      "Content-Type": "application/json",
      // "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.95 Safari/537.36",
    };
    headers["openToken"] = this.openToken;
    const res = await this.ctx.http.request({
      method: method || "POST",
      url,
      data,
      headers,
      skipSslVerify: true,
    });
    if (res.ret !== 0) {
      throw new Error(`请求失败:${res.msg}`);
    }
    return res;
  }

  async getCertList() {
    const res = await this.doRequest({
      urlPath: "/api/ssl",
      data: {},
      method: "GET",
    });
    const list = res.list || [];
    return list;
  }
}

new LuckyAccess();
