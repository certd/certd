import { request } from "../service";

export type SysPublicSetting = {
  registerEnabled:boolean
}


export async function getSysPublicSettings(): Promise<SysPublicSetting> {
  return await request({
    url: "/basic/settings/public",
    method: "get"
  });
}
