import { AccessInput, BaseAccess, IsAccess } from "@certd/pipeline";
@IsAccess({
  name: "yizhifu",
  title: "易支付",
  icon: "svg:icon-yizhifu",
})
export class YizhifuAccess extends BaseAccess {
  @AccessInput({
    title: "url",
    component: {
      placeholder: "https://pay.xxxx.com",
    },
    helper: "易支付系统地址",
    required: true,
    encrypt: false,
  })
  url: string;
  @AccessInput({
    title: "商户id",
    component: {
      placeholder: "pid",
    },
    required: true,
    encrypt: false,
  })
  pid: string;
  @AccessInput({
    title: "key",
    component: {
      placeholder: "key",
    },
    required: true,
    encrypt: true,
  })
  key: string;

  @AccessInput({
    title: "固定支付方式",
    component: {
      placeholder: "固定一种支付方式，也就是submit.php中的type参数",
    },
    helper: "不填则跳转到收银台由用户自己选择，如果您的易支付系统不支持收银台，则必须填写",
    required: false,
    encrypt: false,
  })
  payType: string;

  @AccessInput({
    title: "签名方式",
    component: {
      name: "a-select",
      vModel: "value",
      options: [
        {
          label: "MD5",
          value: "MD5",
        },
        {
          label: "SHA256",
          value: "SHA256",
        },
      ],
    },
    required: true,
    encrypt: false,
  })
  signType: string;
}

new YizhifuAccess();
