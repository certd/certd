import { AddonInput, BaseAddon, IsAddon } from "@certd/lib-server";
import crypto from "crypto";
import { ICaptchaAddon } from "../api.js";

@IsAddon({
  addonType: "captcha",
  name: "geetest",
  title: "极验验证码v4",
  desc: "",
  showTest: false,
})
export class GeeTestCaptcha extends BaseAddon implements ICaptchaAddon {
  @AddonInput({
    title: "验证ID",
    component: {
      placeholder: "captchaId",
    },
    helper: "[极验验证码v4](https://console.geetest.com/sensbot/management) -> 创建业务模块 -> 新增业务场景",
    required: true,
  })
  captchaId = "";

  @AddonInput({
    title: "验证Key",
    component: {
      placeholder: "captchaKey",
    },
    required: true,
  })
  captchaKey = "";

  async onValidate(data?: any) {
    if (!data) {
      return false;
    }
    // geetest 服务地址
    // geetest server url
    const API_SERVER = "http://gcaptcha4.geetest.com";

    // geetest 验证接口
    // geetest server interface
    const API_URL = API_SERVER + "/validate" + "?captcha_id=" + this.captchaId;

    // 前端参数
    // web parameter
    const lot_number = data["lot_number"];
    const captcha_output = data["captcha_output"];
    const pass_token = data["pass_token"];
    const gen_time = data["gen_time"];
    if (!lot_number || !captcha_output || !pass_token || !gen_time) {
      return false;
    }

    // 生成签名, 使用标准的hmac算法，使用用户当前完成验证的流水号lot_number作为原始消息message，使用客户验证私钥作为key
    // 采用sha256散列算法将message和key进行单向散列生成最终的 “sign_token” 签名
    // use lot_number + CAPTCHA_KEY, generate the signature
    const sign_token = this.hmac_sha256_encode(lot_number, this.captchaKey);

    // 向极验转发前端数据 + “sign_token” 签名
    // send web parameter and “sign_token” to geetest server
    const datas = {
      lot_number: lot_number,
      captcha_output: captcha_output,
      pass_token: pass_token,
      gen_time: gen_time,
      sign_token: sign_token,
    };

    // post request
    // 根据极验返回的用户验证状态, 网站主进行自己的业务逻辑
    // According to the user authentication status returned by the geetest, the website owner carries out his own business logic
    try {
      const res = await this.doRequest(datas, API_URL);
      if (res.result == "success") {
        // 验证成功
        // verification successful
        return true;
      } else {
        // 验证失败
        // verification failed
        this.logger.error("极验验证不通过 ", res.reason);
        return false;
      }
    } catch (e) {
      this.ctx.logger.error("极验验证服务异常", e);
      return true;
    }
  }

  // 生成签名
  // Generate signature
  hmac_sha256_encode(value, key) {
    const hash = crypto.createHmac("sha256", key).update(value, "utf8").digest("hex");
    return hash;
  }

  // 发送post请求, 响应json数据如：{"result": "success", "reason": "", "captcha_args": {}}
  // Send a post request and respond to JSON data, such as: {result ":" success "," reason ":" "," captcha_args ": {}}
  async doRequest(datas, url) {
    const options = {
      url: url,
      method: "POST",
      params: datas,
      timeout: 5000,
    };
    const result = await this.ctx.http.request(options);
    return result;
  }

  async getCaptcha(): Promise<any> {
    return {
      captchaId: this.captchaId,
    };
  }
}
