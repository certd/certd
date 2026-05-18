import { request } from "/@/api/service";

export async function GetSettings() {
  return await request({ url: "/sys/invite/settings/get", method: "post" });
}

export async function SaveSettings(data: any) {
  return await request({ url: "/sys/invite/settings/save", method: "post", data });
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
