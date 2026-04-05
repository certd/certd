// @ts-ignore
import { request } from "/src/api/service";
const apiPrefix = "/cert/domain/setting";
export type UserDomainMonitorSetting = {
  enabled?: boolean;
  notificationId?: number;
  cron?: string;
  willExpireDays?: number;
};

export async function DomainMonitorSettingsGet() {
  const res = await request({
    url: apiPrefix + "/get",
    method: "post",
  });
  if (!res) {
    return {};
  }
  return res as UserDomainMonitorSetting;
}
export async function DomainMonitorSettingsSave(data: UserDomainMonitorSetting) {
  await request({
    url: apiPrefix + "/save",
    method: "post",
    data: data,
  });
}
