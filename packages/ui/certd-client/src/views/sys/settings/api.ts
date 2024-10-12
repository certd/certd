// @ts-ignore
import { request } from "/@/api/service";
const apiPrefix = "/sys/settings";
export type SysSettings = { public: SysPublicSetting; private: SysPrivateSetting };

export type SysPublicSetting = {
  registerEnabled?: boolean;
  managerOtherUserPipeline?: boolean;
  icpNo?: string;
};

export type SysPrivateSetting = {
  httpProxy?: string;
  httpsProxy?: string;
};

export const SettingKeys = {
  SysPublic: "sys.public",
  SysPrivate: "sys.private",
  SysEmail: "sys.email"
};
export async function SettingsGet(key: string) {
  const res = await request({
    url: apiPrefix + "/get",
    method: "post",
    params: {
      key
    }
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
      setting: JSON.stringify(setting)
    }
  });
}

export async function EmailSettingsGet() {
  return await request({
    url: apiPrefix + "/getEmailSettings",
    method: "post"
  });
}

export async function stopOtherUserTimer() {
  return await request({
    url: apiPrefix + "/stopOtherUserTimer",
    method: "post"
  });
}

export async function SysSettingsGet(): Promise<SysSettings> {
  return await request({
    url: apiPrefix + "/getSysSettings",
    method: "post"
  });
}

export async function SysSettingsSave(data: SysSettings) {
  return await request({
    url: apiPrefix + "/saveSysSettings",
    method: "post",
    data: data
  });
}
