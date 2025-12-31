import { AccessInput, BaseAccess, IsAccess } from "@certd/pipeline";
@IsAccess({
  name: "wxpay",
  title: "微信支付",
  icon: "tdesign:logo-wechatpay-filled",
})
export class WxpayAccess extends BaseAccess {
  /**
   *   appId: "<-- 请填写您的AppId，例如：2019091767145019 -->",
   *       privateKey: "<-- 请填写您的应用私钥，例如：MIIEvQIBADANB ... ... -->",
   *       alipayPublicKey: "<-- 请填写您的支付宝公钥，例如：MIIBIjANBg... -->",
   */
  @AccessInput({
    title: "AppId",
    component: {
      placeholder: "201909176714xxxx",
    },
    required: true,
    encrypt: false,
  })
  appId: string;
  @AccessInput({
    title: "商户ID",
    component: {
      placeholder: "201909176714xxxx",
    },
    required: true,
    encrypt: false,
  })
  mchid: string;

  @AccessInput({
    title: "公钥",
    component: {
      name: "a-textarea",
      rows: 3,
      placeholder: "MIIBIjANBg...",
    },
    required: true,
    encrypt: true,
  })
  publicKey: string;

  @AccessInput({
    title: "私钥",
    component: {
      placeholder: "MIIEvQIBADANB...",
      name: "a-textarea",
      rows: 3,
    },
    required: true,
    encrypt: true,
  })
  privateKey: string;

  @AccessInput({
    title: "APIv3密钥",
    helper: "微信商户平台—>账户设置—>API安全—>设置APIv3密钥",
    required: true,
    encrypt: true,
  })
  key: string;
}

new WxpayAccess();
