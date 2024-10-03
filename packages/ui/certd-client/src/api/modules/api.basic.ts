import { request } from "../service";

export type SysPublicSetting = {
  registerEnabled: boolean;
  managerOtherUserPipeline: boolean;
  icpNo?: string;
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

export async function getSiteInfo(): Promise<SysInstallInfo> {
  return await request({
    url: "/basic/settings/siteInfo",
    method: "get"
  });
}

export async function bindUrl(data): Promise<SysInstallInfo> {
  return await request({
    url: "/sys/plus/bindUrl",
    method: "post",
    data
  });
}
