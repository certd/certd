// @ts-ignore
import { request } from "/@/api/service";
const apiPrefix = "/user/settings";
export type UserGrantSetting = {
  allowAdminViewCerts: boolean;
};

export async function GrantSettingsGet() {
  const res = await request({
    url: apiPrefix + "/grant/get",
    method: "post",
  });
  if (!res) {
    return {};
  }
  return res as UserGrantSetting;
}

export async function UserSettingSave(req: any) {
  return await request({
    url: apiPrefix + "/grant/save",
    method: "post",
    data: req,
  });
}
