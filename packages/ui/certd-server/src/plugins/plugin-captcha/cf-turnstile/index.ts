import { AddonInput, BaseAddon, IsAddon } from "@certd/lib-server";
import { CaptchaRequest, ICaptchaAddon } from "../api.js";

@IsAddon({
  addonType: "captcha",
  name: "cfTurnstile",
  title: "Cloudflare Turnstile",
  desc: "",
  showTest: false,
})
export class CfTurnstileCaptcha extends BaseAddon implements ICaptchaAddon {

  @AddonInput({
    title: "SiteKey",
    component: {
      placeholder: "SiteKey",
    },
    helper: "[Cloudflare Turnstile](https://www.cloudflare.com/zh-cn/application-services/products/turnstile/)",
    required: true,
  })
  siteKey = "";

  @AddonInput({
    title: "SecretKey",
    component: {
      placeholder: "SecretKey",
    },
    required: true,
  })
  secretKey = "";

  async onValidate(data?: any, req?: CaptchaRequest) {
    if (!data) {
      return false;
    }
    const { token } = data;
    const { remoteIp } = req;

    const formData = new FormData();
    formData.append('secret', this.secretKey);
    formData.append('response', token);
    formData.append('remoteip', remoteIp);

      const res = await this.http.request({
        url: 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        data: formData
      })

      if (res.success) {
        // Token is valid - process the form
        return true;
      } else {
        // Token is invalid - reject the submission
        const errorMessage = 'Cloudflare Turnstile 校验失败:' + res['error-codes'].join(', ')
        this.logger.error(errorMessage);
        throw new Error(errorMessage);
      }
   

  }

  async getCaptcha(): Promise<any> {
    return {
      siteKey: this.siteKey,
    };
  }
}
