import { request } from "/src/api/service";

export async function getMineInfo() {
  return await request({
    url: "/mine/info",
    method: "POST",
  });
}

export async function changePassword(form: any) {
  return await request({
    url: "/mine/changePassword",
    method: "POST",
    data: form,
  });
}

export async function UpdateProfile(form: any) {
  return await request({
    url: "/mine/updateProfile",
    method: "POST",
    data: form,
  });
}

export async function GetContactCapability() {
  return await request({
    url: "/mine/contact/capability",
    method: "POST",
  });
}

export async function UpdateMobile(form: any) {
  return await request({
    url: "/mine/contact/mobile",
    method: "POST",
    data: form,
  });
}

export async function VerifyContactIdentity(form: any) {
  return await request({
    url: "/mine/contact/verifyIdentity",
    method: "POST",
    data: form,
  });
}

export async function UpdateEmail(form: any) {
  return await request({
    url: "/mine/contact/email",
    method: "POST",
    data: form,
  });
}

export async function GetOauthBounds() {
  return await request({
    url: "/oauth/bounds",
    method: "POST",
  });
}

export async function GetOauthProviders() {
  return await request({
    url: "/oauth/providers",
    method: "POST",
  });
}

export async function UnbindOauth(type: string) {
  return await request({
    url: "/oauth/unbind",
    method: "POST",
    data: { type },
  });
}

export async function OauthBoundUrl(type: string) {
  return await request({
    url: "/oauth/login",
    method: "POST",
    data: {
      type,
      forType: "bind",
    },
  });
}

export async function GetPasskeys() {
  return await request({
    url: "/mine/passkey/list",
    method: "POST",
  });
}

export async function UnbindPasskey(id: number) {
  return await request({
    url: "/mine/passkey/unbind",
    method: "POST",
    data: { id },
  });
}

export interface PasskeyRegistrationOptions {
  rp: {
    name: string;
    id: string;
  };
  user: {
    id: Uint8Array;
    name: string;
    displayName: string;
  };
  challenge: string;
  pubKeyCredParams: {
    type: string;
    alg: number;
  }[];
  timeout: number;
  attestation: string;
  excludeCredentials: any[];
}

export interface PasskeyAuthenticationOptions {
  rpId: string;
  challenge: string;
  timeout: number;
  allowCredentials: any[];
}

export interface PasskeyCredential {
  id: string;
  type: string;
  rawId: string;
  response: {
    attestationObject: string;
    clientDataJSON: string;
  };
}

export async function generatePasskeyRegistrationOptions() {
  return await request({
    url: "/mine/passkey/generateRegistration",
    method: "post",
  });
}

export async function verifyPasskeyRegistration(response: any, challenge: string, deviceName: string) {
  return await request({
    url: "/mine/passkey/verifyRegistration",
    method: "post",
    data: { response, challenge, deviceName },
  });
}

export async function registerPasskey(response: any, challenge: string, deviceName: string) {
  return await request({
    url: "/mine/passkey/register",
    method: "post",
    data: { response, challenge, deviceName },
  });
}
