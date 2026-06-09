import { AddonInput, BaseAddon, IsAddon } from "@certd/lib-server";
import { ICaptchaAddon } from "../api.js";
import { TencentAccess } from "../../plugin-lib/tencent/access.js";

@IsAddon({
  addonType: "captcha",
  name: "tencent",
  title: "腾讯云验证码",
  desc: "",
  showTest: false,
})
export class TencentCaptcha extends BaseAddon implements ICaptchaAddon {
  @AddonInput({
    title: "腾讯云授权",
    helper: "腾讯云授权",
    component: {
      name: "access-selector",
      vModel: "modelValue",
      from: "sys",
      type: "tencent", //固定授权类型
    },
    required: true,
  })
  accessId: number;

  @AddonInput({
    title: "验证ID",
    component: {
      name: "a-input-number",
      placeholder: "CaptchaAppId",
    },
    helper: "[腾讯云验证码](https://cloud.tencent.com/act/cps/redirect?redirect=37716&cps_key=b3ef73330335d7a6efa4a4bbeeb6b2c9)",
    required: true,
  })
  captchaAppId: number;

  @AddonInput({
    title: "验证Key",
    component: {
      placeholder: "AppSecretKey",
    },
    required: true,
  })
  appSecretKey = "";

  async onValidate(data?: any) {
    if (!data) {
      return false;
    }

    const access = await this.getAccess<TencentAccess>(this.accessId);

    const sdk = await import("tencentcloud-sdk-nodejs/tencentcloud/services/captcha/v20190722/index.js");

    const CaptchaClient = sdk.v20190722.Client;

    const clientConfig = {
      credential: {
        secretId: access.secretId,
        secretKey: access.secretKey,
      },
      region: "",
      profile: {
        httpProfile: {
          endpoint: "captcha.tencentcloudapi.com",
        },
      },
    };

    // 实例化要请求产品的client对象,clientProfile是可选的
    const client = new CaptchaClient(clientConfig);
    const params = {
      CaptchaType: 9, //固定值9
      UserIp: "127.0.0.1",
      Ticket: data.ticket,
      Randstr: data.randstr,
      AppSecretKey: this.appSecretKey,
      CaptchaAppId: this.captchaAppId,
    };
    try {
      const res = await client.DescribeCaptchaResult(params);
      if (res.CaptchaCode == 1) {
        // 验证成功
        // verification successful
        return true;
      } else {
        // 验证失败
        // verification failed
        this.logger.error("腾讯云验证码验证失败", res.CaptchaMsg);
        return false;
      }
    } catch (err) {
      if (data.ticket.startsWith("trerror_") && err.message.includes("账户已欠费")) {
        this.logger.error("腾讯云验证码账户欠费，临时放行：", err.message);
        return true;
      }
      throw err;
    }
  }

  async getCaptcha(): Promise<any> {
    return {
      captchaAppId: this.captchaAppId,
    };
  }
}
