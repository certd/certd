import { request } from "/@/api/service";
const apiPrefix = "/user/settings";

export const SettingKeys = {
  Email: "email"
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
