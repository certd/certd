// @ts-ignore
import { request } from "/src/api/service";
const apiPrefix = "/sys/site";

export async function SettingsGet(key: string) {
  return await request({
    url: apiPrefix + "/get",
    method: "post"
  });
}

export async function SettingsSave(setting: any) {
  await request({
    url: apiPrefix + "/save",
    method: "post",
    data: setting
  });
}
