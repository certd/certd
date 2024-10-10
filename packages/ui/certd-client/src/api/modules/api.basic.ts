import { request } from "../service";
import { SiteEnv, SiteInfo } from "/@/store/modules/settings";

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

export async function getSiteInfo(): Promise<SiteInfo> {
  return await request({
    url: "/basic/settings/siteInfo",
    method: "get"
  });
}
export async function getSiteEnv(): Promise<SiteEnv> {
  return await request({
    url: "/basic/settings/siteEnv",
    method: "get"
  });
}

export async function bindUrl(data: any): Promise<any> {
  return await request({
    url: "/sys/plus/bindUrl",
    method: "post",
    data
  });
}

export async function getPlusInfo() {
  return await request({
    url: "/basic/settings/plusInfo",
    method: "get"
  });
}
