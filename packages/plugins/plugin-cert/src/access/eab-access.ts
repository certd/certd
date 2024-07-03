import { IsAccess, AccessInput } from "@certd/pipeline";

@IsAccess({
  name: "eab",
  title: "EAB授权",
  desc: "ZeroSSL证书申请需要EAB授权",
})
export class EabAccess {
  @AccessInput({
    title: "KID",
    component: {
      placeholder: "kid",
    },
    helper: "EAB KID",
    required: true,
  })
  kid = "";
  @AccessInput({
    title: "HMACKey",
    component: {
      placeholder: "HMAC Key",
    },
    helper: "EAB HMAC Key",
    required: true,
  })
  hmacKey = "";
}

new EabAccess();
