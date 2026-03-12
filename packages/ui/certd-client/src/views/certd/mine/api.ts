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
    url: "/mine/passkeys",
    method: "POST",
  });
}

export async function UnbindPasskey(id: number) {
  return await request({
    url: "/mine/unbindPasskey",
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
    url: "/passkey/generateRegistration",
    method: "post",
  });
}

export async function verifyPasskeyRegistration(userId: number, response: any, challenge: string, deviceName: string) {
  return await request({
    url: "/passkey/verifyRegistration",
    method: "post",
    data: { userId, response, challenge, deviceName },
  });
}

export async function generatePasskeyAuthenticationOptions(userId: number) {
  return await request({
    url: "/passkey/generateAuthentication",
    method: "post",
    data: { userId },
  });
}

export async function loginByPasskey(userId: number, credential: any, challenge: string) {
  return await request({
    url: "/passkey/login",
    method: "post",
    data: { userId, credential, challenge },
  });
}

export async function registerPasskey(userId: number, response: any, challenge: string) {
  return await request({
    url: "/passkey/register",
    method: "post",
    data: { userId, response, challenge },
  });
}
