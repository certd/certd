import { IsAccess, AccessInput, BaseAccess } from "@certd/pipeline";
import * as acme from "@certd/acme-client";

@IsAccess({
  name: "eab",
  title: "EAB access",
  desc: "ZeroSSL certificate issuance requires EAB access",
  icon: "ic:outline-lock",
})
export class EabAccess extends BaseAccess {
  @AccessInput({
    title: "EAB type",
    component: {
      name: "a-select",
      options: [
        { value: "google", label: "Google", icon: "flat-color-icons:google" },
        { value: "zerossl", label: "ZeroSSL", icon: "emojione:digit-zero" },
        { value: "litessl", label: "litessl", icon: "roentgen:free" },
        { value: "sslcom", label: "SSL.com", icon: "la:expeditedssl" },
      ],
    },
    helper: "Please select an EAB type",
    required: true,
    encrypt: false,
  })
  eabType = "";

  @AccessInput({
    title: "KID",
    component: {
      placeholder: "kid / keyId",
    },
    helper: "EAB KID. Google calls this keyId; SSL.com calls this Account/ACME Key.",
    required: true,
    encrypt: true,
  })
  kid = "";
  @AccessInput({
    title: "HMACKey",
    component: {
      placeholder: "HMAC Key / b64MacKey",
    },
    helper: "EAB HMAC Key. Google calls this b64MacKey.",
    required: true,
    encrypt: true,
  })
  hmacKey = "";

  @AccessInput({
    title: "email",
    component: {
      placeholder: "Bind an email address",
    },
    rules: [{ type: "email", message: "Please enter a valid email address" }],
    helper: "Bind an email address to avoid expiration",
    required: true,
  })
  email = "";

  @AccessInput({
    title: "ACME account private key",
    component: {
      name: "refresh-input",
      action: "GenerateAccountKey",
      buttonText: "Generate",
      successMessage: "The account private key has been generated. Please save the access configuration.",
    },
    required: true,
    helper: "If you changed the KID, click Generate to regenerate the account private key.\nNote: Google EAB can generate an account private key only once. Updating the private key requires a new EAB access.",
    encrypt: true,
  })
  accountKey = "";

  async onGenerateAccountKey() {
    if (!this.kid) {
      throw new Error("Please enter the KID first");
    }
    const key = await acme.crypto.createPrivateKey(2048);
    return JSON.stringify({
      kid: this.kid,
      privateKey: key.toString(),
    });
  }
}

new EabAccess();
