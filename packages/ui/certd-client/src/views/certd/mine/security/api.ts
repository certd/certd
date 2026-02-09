// @ts-ignore
import { request } from "/@/api/service";
const apiPrefix = "/user/settings";
export type UserTwoFactorSetting = {
  authenticator: {
    enabled: boolean;
    verified: boolean;
  };
};

export type AuthenticatorSaveReq = {
  verifyCode?: string;
};

export async function TwoFactorSettingsGet() {
  const res = await request({
    url: apiPrefix + "/twoFactor/get",
    method: "post",
  });
  if (!res) {
    return {};
  }
  return res as UserTwoFactorSetting;
}

export async function TwoFactorAuthenticatorGet() {
  const res = await request({
    url: apiPrefix + "/twoFactor/authenticator/qrcode",
    method: "post",
  });
  return res as { qrcode: string; link: string; secret: string }; //base64
}

export async function TwoFactorAuthenticatorSave(req: AuthenticatorSaveReq) {
  return await request({
    url: apiPrefix + "/twoFactor/authenticator/save",
    method: "post",
    data: req,
  });
}

export async function TwoFactorAuthenticatorOff() {
  return await request({
    url: apiPrefix + "/twoFactor/authenticator/off",
    method: "post",
  });
}
