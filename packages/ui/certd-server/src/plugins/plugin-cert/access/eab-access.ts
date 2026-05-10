import { IsAccess, AccessInput, BaseAccess } from "@certd/pipeline";
import * as acme from "@certd/acme-client";

@IsAccess({
  name: "eab",
  title: "EAB授权",
  desc: "ZeroSSL证书申请需要EAB授权",
  icon: "ic:outline-lock",
})
export class EabAccess extends BaseAccess {
  @AccessInput({
    title: "EAB类型",
    component: {
      name: "a-select",
      options: [
        { value: "google", label: "Google（免费）", icon: "flat-color-icons:google" },
        { value: "zerossl", label: "ZeroSSL（免费）", icon: "emojione:digit-zero" },
        { value: "litessl", label: "litessl（免费）", icon: "roentgen:free" },
        { value: "sslcom", label: "SSL.com（仅主域名和www免费）", icon: "la:expeditedssl" },
      ],
    },
    helper: "请选择EAB类型",
    required: true,
    encrypt: false,
  })
  eabType = "";

  @AccessInput({
    title: "KID",
    component: {
      placeholder: "kid / keyId",
    },
    helper: "EAB KID， google的叫 keyId，ssl.com的叫Account/ACME Key",
    required: true,
    encrypt: true,
  })
  kid = "";
  @AccessInput({
    title: "HMACKey",
    component: {
      placeholder: "HMAC Key / b64MacKey",
    },
    helper: "EAB HMAC Key ，google的叫b64MacKey",
    required: true,
    encrypt: true,
  })
  hmacKey = "";

  @AccessInput({
    title: "email",
    component: {
      placeholder: "绑定一个邮箱",
    },
    rules: [{ type: "email", message: "请输入正确的邮箱" }],
    helper: "绑定一个邮箱，避免失效",
    required: true,
  })
  email = "";

  @AccessInput({
    title: "ACME账号私钥",
    component: {
      name: "refresh-input",
      action: "GenerateAccountKey",
      buttonText: "刷新",
      successMessage: "账号私钥已刷新，请保存授权配置",
    },
    required: true,
    helper: "如果修改了KID，请点击刷新重新生成账号私钥\n注意：google的EAB只能生成一次账号私钥，更新私钥需要获取一个新的EAB授权",
    encrypt: true,
  })
  accountKey = "";

  async onGenerateAccountKey() {
    if (!this.kid) {
      throw new Error("请先填写KID");
    }
    const key = await acme.crypto.createPrivateKey(2048);
    return JSON.stringify({
      kid: this.kid,
      privateKey: key.toString(),
    });
  }
}

new EabAccess();
