import { request } from "/src/api/service";

export async function doActive(form: any) {
  return await request({
    url: "/sys/plus/active",
    method: "post",
    data: form,
  });
}

export async function getVipTrial(vipType: string) {
  return await request({
    url: "/sys/plus/getVipTrial",
    method: "post",
    data: { vipType },
  });
}

export async function getTodayVipOrderCount() {
  return await request({
    url: "/sys/plus/getTodayVipOrderCount",
    method: "post",
    showErrorNotify: false,
  });
}
