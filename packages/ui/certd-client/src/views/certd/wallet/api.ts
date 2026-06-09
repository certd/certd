import { request } from "/@/api/service";

export async function GetWalletSummary() {
  return await request({ url: "/wallet/summary", method: "post" });
}

export async function GetWithdrawSetting() {
  return await request({ url: "/wallet/withdraw/setting/get", method: "post" });
}

export async function GetWalletSetting() {
  return await request({ url: "/wallet/settings/get", method: "post" });
}

export async function SaveWithdrawSetting(data: any) {
  return await request({ url: "/wallet/withdraw/setting/save", method: "post", data });
}

export async function ApplyWithdraw(amount: number) {
  return await request({ url: "/wallet/withdraw/apply", method: "post", data: { amount } });
}

export async function GetWithdraws(query: any) {
  return await request({ url: "/wallet/withdraw/page", method: "post", data: query });
}

export async function GetWalletLogs(query: any) {
  return await request({ url: "/wallet/log/page", method: "post", data: query });
}
