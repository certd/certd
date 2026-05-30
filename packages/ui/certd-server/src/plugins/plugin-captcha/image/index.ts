import { BaseAddon, IsAddon } from "@certd/lib-server";
import { ICaptchaAddon } from "../api.js";
import { cache } from "@certd/basic";
import { nanoid } from "nanoid";

@IsAddon({
  addonType: "captcha",
  name: "image",
  title: "图片验证码",
  desc: "",
  showTest: false,
})
export class ImageCaptcha extends BaseAddon implements ICaptchaAddon {
  async onValidate(data?: any) {
    if (!data) {
      return false;
    }
    return await this.checkCaptcha(data.randomStr, data.imageCode);
  }

  async getCaptchaText(randomStr: string) {
    return cache.get("imgCode:" + randomStr);
  }

  async removeCaptcha(randomStr: string) {
    cache.delete("imgCode:" + randomStr);
  }

  async checkCaptcha(randomStr: string, userCaptcha: string) {
    const code = await this.getCaptchaText(randomStr);
    if (code == null) {
      throw new Error("验证码已过期");
    }
    if (code.toLowerCase() !== userCaptcha?.toLowerCase()) {
      throw new Error("验证码不正确");
    }
    await this.removeCaptcha(randomStr);
    return true;
  }

  async getCaptcha(): Promise<any> {
    const svgCaptcha = await import("svg-captcha");
    const c = svgCaptcha.create();
    //{data: '<svg.../svg>', text: 'abcd'}
    const imgCode = c.text; // = RandomUtil.randomStr(4, true);
    const randomStr = nanoid(10);
    cache.set("imgCode:" + randomStr, imgCode, {
      ttl: 2 * 60 * 1000, //过期时间 2分钟
    });
    return {
      randomStr: randomStr,
      imageData: c.data,
    };
  }
}
