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
      placeholder: "kid",
    },
    helper: "EAB KID",
    required: true,
    encrypt: true,
  })
  kid = "";
  @AccessInput({
    title: "HMACKey",
    component: {
      placeholder: "HMAC Key",
    },
    helper: "EAB HMAC Key",
    required: true,
    encrypt: true,
  })
  hmacKey = "";

  @AccessInput({
    title: "email",
    component: {
      placeholder: "绑定一个邮箱",
    },
    helper: "Google EAB 申请证书绑定邮箱后，不能更换，否则会导致EAB失效",
    required: false,
  })
  email = "";
}

new EabAccess();
