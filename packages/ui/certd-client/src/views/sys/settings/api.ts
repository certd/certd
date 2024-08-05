// @ts-ignore
import { request } from "/@/api/service";
const apiPrefix = "/sys/settings";

export const SettingKeys = {
  SysPublic: "sys.public",
  SysPrivate: "sys.private"
};
export async function SettingsGet(key: string) {
  return await request({
    url: apiPrefix + "/get",
    method: "post",
    params: {
      key
    }
  });
}

export async function SettingsSave(key: string, setting: any) {
  await request({
    url: apiPrefix + "/save",
    method: "post",
    data: {
      key,
      setting: JSON.stringify(setting)
    }
  });
}

export async function PublicSettingsSave(setting: any) {
  await request({
    url: apiPrefix + "/savePublicSettings",
    method: "post",
    data: setting
  });
}

export async function stopOtherUserTimer() {
  await request({
    url: apiPrefix + "/stopOtherUserTimer",
    method: "post"
  });
}
