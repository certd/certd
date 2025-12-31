import { AccessInput, BaseAccess, IsAccess } from "@certd/pipeline";
@IsAccess({
  name: "alipay",
  title: "支付宝",
  icon: "ion:logo-alipay",
})
export class AlipayAccess extends BaseAccess {
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
    title: "应用私钥",
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
    title: "支付宝公钥",
    component: {
      name: "a-textarea",
      rows: 3,
      placeholder: "MIIBIjANBg...",
    },
    required: true,
    encrypt: true,
  })
  alipayPublicKey: string;
}

new AlipayAccess();
