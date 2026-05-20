import { AddonInput, BaseAddon, IsAddon } from "@certd/lib-server";
import { BuildLoginUrlReq, BuildLogoutUrlReq, IOauthProvider, OnCallbackReq } from "../api.js";

const CLOGIN_TYPES = [
  { label: "QQ", value: "qq", icon: "svg:icon-qq" },
  { label: "微信", value: "wx", icon: "svg:icon-wechat" },
  { label: "支付宝", value: "alipay", icon: "simple-icons:alipay:#0099ff" },
  { label: "微博", value: "sina", icon: "uiw:weibo:#FF3B30" },
  { label: "百度", value: "baidu", icon: "simple-icons:baidu:#007AFF" },
  { label: "华为", value: "huawei", icon: "simple-icons:huawei:#ff0000" },
  { label: "小米", value: "xiaomi", icon: "simple-icons:xiaomi:#FF9500" },
  { label: "谷歌", value: "google", icon: "flat-color-icons:google" },
  { label: "微软", value: "microsoft", icon: "logos:microsoft-icon" },
  { label: "Facebook", value: "facebook", icon: "logos:facebook" },
  { label: "Twitter", value: "twitter", icon: "logos:twitter" },
  { label: "钉钉", value: "dingtalk", icon: "ant-design:dingding-outlined:#007AFF" },
  { label: "Gitee", value: "gitee", icon: "simple-icons:gitee:#c71d23" },
  { label: "Github", value: "github", icon: "logos:github-icon" },
];

function getCloginType(subtype?: string, loginType?: string | string[]) {
  const types = Array.isArray(loginType) ? loginType : [loginType];
  const type = subtype || types.find(item => !!item);
  if (!type) {
    throw new Error("请选择彩虹聚合登录类型");
  }
  return type;
}

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
      name: "a-select",
      vModel: "value",
      mode: "tags",
      multiple: true,
      options: CLOGIN_TYPES,
    },
    required: true,
  })
  loginType: string[] | string = [];

  get types() {
    const loginTypes = Array.isArray(this.loginType) ? this.loginType : [this.loginType].filter(Boolean);
    return loginTypes.map(type => {
      const option = CLOGIN_TYPES.find(item => item.value === type);
      return {
        type,
        name: option?.label || type,
        icon: option?.icon,
      };
    });
  }

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
    const loginType = getCloginType(params.subtype, this.loginType);
    // if(redirectUri.indexOf("localhost:3008")>=0){
    //   redirectUri = redirectUri.replace("localhost:3008", "certd.handfree.work")
    // }
    const res = await this.ctx.http.request({
      url: `${this.endpoint}/connect.php?act=login&appid=${this.appId}&appkey=${this.appKey}&type=${loginType}&redirect_uri=${redirectUri}&state=${params.state}`
    })

    this.checkRes(res)

    return {
      loginUrl: res.url,
      ticketValue: {},
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
    const loginType = getCloginType(req.ticketValue?.subtype, this.loginType);

    const tokenEndpoint = `${this.endpoint}/connect.php?act=callback&appid=${this.appId}&appkey=${this.appKey}&type=${loginType}&code=${code}`
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
