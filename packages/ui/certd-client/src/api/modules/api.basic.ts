import { request } from "../service";

export type SysPublicSetting = {
  registerEnabled: boolean;
  managerOtherUserPipeline: boolean;
};

export type SysInstallInfo = {
  siteId: string;
};

export async function getSysPublicSettings(): Promise<SysPublicSetting> {
  return await request({
    url: "/basic/settings/public",
    method: "get"
  });
}

export async function getInstallInfo(): Promise<SysInstallInfo> {
  return await request({
    url: "/basic/settings/install",
    method: "get"
  });
}
