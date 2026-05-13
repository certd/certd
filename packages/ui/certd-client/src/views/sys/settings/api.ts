// @ts-ignore
import { request } from "/@/api/service";
import { SysPrivateSetting, SysPublicSetting } from "/@/store/settings/api.basic";
const apiPrefix = "/sys/settings";
export type SysSettings = { public: SysPublicSetting; private: SysPrivateSetting };

export const SettingKeys = {
  SysPublic: "sys.public",
  SysPrivate: "sys.private",
  SysEmail: "sys.email",
};
export async function SettingsGet(key: string) {
  const res = await request({
    url: apiPrefix + "/get",
    method: "post",
    params: {
      key,
    },
  });
  if (!res) {
    return {};
  }
  return JSON.parse(res.setting);
}

export async function SettingsSave(key: string, setting: any) {
  return await request({
    url: apiPrefix + "/save",
    method: "post",
    data: {
      key,
      setting: JSON.stringify(setting),
    },
  });
}

export async function HeaderMenusSettingsSave(setting: any) {
  return await request({
    url: apiPrefix + "/headerMenus/save",
    method: "post",
    data: setting,
  });
}

export async function EmailSettingsGet() {
  return await request({
    url: apiPrefix + "/getEmailSettings",
    method: "post",
  });
}

export async function EmailSettingsSave(setting: any) {
  return await request({
    url: apiPrefix + "/saveEmailSettings",
    method: "post",
    data: setting,
  });
}

export async function stopOtherUserTimer() {
  return await request({
    url: apiPrefix + "/stopOtherUserTimer",
    method: "post",
  });
}

export async function SysSettingsGet(): Promise<SysSettings> {
  return await request({
    url: apiPrefix + "/getSysSettings",
    method: "post",
  });
}

export async function SysSettingsSave(data: SysSettings) {
  return await request({
    url: apiPrefix + "/saveSysSettings",
    method: "post",
    data: data,
  });
}

export async function TestCaptcha(form: any) {
  return await request({
    url: apiPrefix + "/captchaTest",
    method: "post",
    data: form,
  });
}

export async function TestProxy() {
  return await request({
    url: apiPrefix + "/testProxy",
    method: "post",
  });
}

export async function TestSms(data: any) {
  return await request({
    url: apiPrefix + "/testSms",
    method: "post",
    data,
  });
}

export async function GetSmsTypeDefine(type: string) {
  return await request({
    url: apiPrefix + "/getSmsTypeDefine",
    method: "post",
    data: {
      type,
    },
  });
}

export async function GetOauthProviders() {
  return await request({
    url: apiPrefix + "/oauth/providers",
    method: "post",
  });
}
