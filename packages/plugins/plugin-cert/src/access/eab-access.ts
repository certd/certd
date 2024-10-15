import { IsAccess, AccessInput, BaseAccess } from "@certd/pipeline";

@IsAccess({
  name: "eab",
  title: "EAB授权",
  desc: "ZeroSSL证书申请需要EAB授权",
})
export class EabAccess extends BaseAccess {
  @AccessInput({
    title: "KID",
    component: {
      placeholder: "kid / keyId",
    },
    helper: "EAB KID， google的叫 keyId",
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
    rules: { type: "email", message: "请输入正确的邮箱" },
    helper: "Google的EAB申请证书，更换邮箱会导致EAB失效，可以在此处绑定一个邮箱避免此问题",
    required: false,
  })
  email = "";
}

new EabAccess();
