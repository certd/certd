import { request } from "/@/api/service";

export async function GetSettings() {
  return await request({ url: "/sys/invite/settings/get", method: "post" });
}

export async function SaveSettings(data: any) {
  return await request({ url: "/sys/invite/settings/save", method: "post", data });
}

export async function GetLevels(query: any) {
  return await request({ url: "/sys/invite/level/page", method: "post", data: query });
}

export async function GetLevelList() {
  return await request({ url: "/sys/invite/level/list", method: "post", data: {} });
}

export async function AddLevel(data: any) {
  return await request({ url: "/sys/invite/level/add", method: "post", data });
}

export async function UpdateLevel(data: any) {
  return await request({ url: "/sys/invite/level/update", method: "post", data });
}

export async function DeleteLevel(id: number) {
  return await request({ url: "/sys/invite/level/delete", method: "post", params: { id } });
}

export async function GetUserLevels(query: any) {
  return await request({ url: "/sys/invite/user/page", method: "post", data: query });
}

export async function SetUserLevel(data: any) {
  return await request({ url: "/sys/invite/user/setLevel", method: "post", data });
}

export async function GetWithdraws(query: any) {
  return await request({ url: "/sys/wallet/withdraw/page", method: "post", data: query });
}

export async function ApproveWithdraw(id: number, remark?: string) {
  return await request({ url: "/sys/wallet/withdraw/approve", method: "post", data: { id, remark } });
}

export async function RejectWithdraw(id: number, remark: string) {
  return await request({ url: "/sys/wallet/withdraw/reject", method: "post", data: { id, remark } });
}
