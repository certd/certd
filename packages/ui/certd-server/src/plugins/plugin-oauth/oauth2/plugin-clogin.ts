import { AddonInput, BaseAddon, IsAddon } from "@certd/lib-server";
import { BuildLoginUrlReq, BuildLogoutUrlReq, IOauthProvider, OnCallbackReq } from "../api.js";

@IsAddon({
  addonType: "oauth",
  name: 'clogin',
  title: '彩虹聚合登录',
  desc: '彩虹聚合登录',
  icon: "emojione:rainbow",
  showTest: false,
})
export class CloginOauthProvider extends BaseAddon implements IOauthProvider {
  @AddonInput({
    title: "系统地址",
    helper: "http://clogin.xxxx.com/",
    required: true,
    col:{span:24},
  })
  endpoint = "";

  @AddonInput({
    title: "登录类型",
    component: {
      name: "a-auto-complete",
      options: [
        { label: "QQ", value: "qq" },
        { label: "微信", value: "wx" },
        { label: "支付宝", value: "alipay" },
        { label: "微博", value: "sina" },
        { label: "百度", value: "baidu" },
        { label: "华为", value: "huawei" },
        { label: "小米", value: "xiaomi" },
        { label: "谷歌", value: "google" },
        { label: "微软", value: "microsoft" },
        { label: "Facebook", value: "facebook" },
        { label: "Twitter", value: "twitter" },
        { label: "钉钉", value: "dingtalk" },
        { label: "Gitee", value: "gitee" },
        { label: "Github", value: "github" },
      ]
    },
    required: true,
  })
  loginType = "";

  @AddonInput({
    title: "自定义图标",
    component: {
      name:"fs-icon-selector",
      vModel:"modelValue"
    },
    required: false,
  })
  icon = "";

  @AddonInput({
    title: "AppId",
    helper: "彩虹聚合登录->应用列表->创建应用 获取",
    required: true,
  })
  appId = "";

  @AddonInput({
    title: "AppKey",
    component: {
      placeholder: "AppKey",
    },
    required: true,
  })
  appKey = "";


  async buildLoginUrl(params: BuildLoginUrlReq) {

    let redirectUri = params.redirectUri || ""
    // if(redirectUri.indexOf("localhost:3008")>=0){
    //   redirectUri = redirectUri.replace("localhost:3008", "certd.handfree.work")
    // }
    const res = await this.ctx.http.request({
      url: `${this.endpoint}/connect.php?act=login&appid=${this.appId}&appkey=${this.appKey}&type=${this.loginType}&redirect_uri=${redirectUri}`
    })

    this.checkRes(res)

    return {
      loginUrl: res.url,
      ticketValue: {
        state: "",
      },
    };
  }

  checkRes(res: any) {
    if (res.code !== 0) {
      throw new Error(res.msg || "请求接口失败")
    }
  }

  async onCallback(req: OnCallbackReq) {

    //校验state

    const code = req.code || ""

    const tokenEndpoint = `${this.endpoint}/connect.php?act=callback&appid=${this.appId}&appkey=${this.appKey}&type=${this.loginType}&code=${code}`
    const res = await this.ctx.utils.http.request({
      url: tokenEndpoint,
      method: "post",
    })
    this.checkRes(res)

    /**
     *  "access_token": "89DC9691E274D6B596FFCB8D43368234",
     * "social_uid": "AD3F5033279C8187CBCBB29235D5F827",
  "faceimg": "https://thirdqq.qlogo.cn/g?b=oidb&k=3WrWp3peBxlW4MFxDgDJEQ&s=100&t=1596856919",
  "nickname": "大白",
  "location": "XXXXX市",
  "gender": "男",
  "ip": "1.12.3.40"
     */

    const { access_token, faceimg, nickname, social_uid } = res


    return {
      token: {
        accessToken: access_token,
        expiresIn: 7200,
        refreshToken: "",
      },
      userInfo: {
        openId: social_uid,
        nickName: nickname || "",
        avatar: faceimg || "",
      },
    }
  };

  async buildLogoutUrl(params: BuildLogoutUrlReq) {
    return {};
  }
}
