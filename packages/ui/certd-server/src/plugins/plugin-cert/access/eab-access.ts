import { IsAccess, AccessInput, BaseAccess } from "@certd/pipeline";
import * as acme from "@certd/acme-client";

@IsAccess({
  name: "eab",
  title: "EAB授权",
  desc: "ZeroSSL证书申请需要EAB授权",
  i18n: {
    "en-US": {
      title: "EAB Credentials",
      desc: "EAB credentials required for certificate requests with ZeroSSL and other CAs.",
      input: {
        eabType: { title: "EAB Provider", helper: "Select the EAB provider." },
        kid: { title: "KID", helper: "EAB KID. Google calls this keyId; SSL.com calls it Account/ACME Key." },
        hmacKey: { title: "HMAC Key", helper: "EAB HMAC Key. Google calls this b64MacKey." },
        email: {
          title: "Email",
          component: { placeholder: "Email associated with this account" },
          helper: "Bind an email address to help prevent the credentials from expiring.",
          rules: [{ type: "email", message: "Enter a valid email address." }],
        },
        accountKey: {
          title: "ACME Account Private Key",
          component: { buttonText: "Generate", successMessage: "Account private key generated. Save this access configuration." },
          helper: "If you change the KID, generate a new account private key. Google EAB can only create an account key once; obtain new EAB credentials before replacing it.",
        },
      },
    },
  },
  icon: "ic:outline-lock",
})
export class EabAccess extends BaseAccess {
  @AccessInput({
    title: "EAB类型",
    component: {
      name: "a-select",
      options: [
        { value: "google", label: "Google", icon: "flat-color-icons:google" },
        { value: "zerossl", label: "ZeroSSL", icon: "emojione:digit-zero" },
        { value: "litessl", label: "litessl", icon: "roentgen:free" },
        { value: "sslcom", label: "SSL.com", icon: "la:expeditedssl" },
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
      buttonText: "生成",
      successMessage: "账号私钥已生成，请保存授权配置",
    },
    required: true,
    helper: "如果修改了KID，请点击生成重新生成账号私钥\n注意：google的EAB只能生成一次账号私钥，更新私钥需要获取一个新的EAB授权",
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
