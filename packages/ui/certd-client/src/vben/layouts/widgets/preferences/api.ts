// @ts-ignore
import { request } from "/@/api/service";

const apiPrefix = "/user/settings/preferences";

export async function PreferencesSettingsGet(): Promise<Record<string, any> | null> {
  const res = await request({
    url: apiPrefix + "/get",
    method: "post",
    showErrorNotify: false,
  });
  return (res as Record<string, any>) || null;
}

export async function PreferencesSettingsSave(preferences: Record<string, any>) {
  return await request({
    url: apiPrefix + "/save",
    method: "post",
    data: { preferences },
  });
}
