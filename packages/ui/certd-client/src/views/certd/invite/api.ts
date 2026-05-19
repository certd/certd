import { request } from "/@/api/service";

export async function GetMyInvite() {
  return await request({ url: "/invite/my", method: "post" });
}

export async function OpenInvitePlan() {
  return await request({ url: "/invite/open", method: "post" });
}

export async function GetInvitees(query: any) {
  return await request({ url: "/invite/invitees/page", method: "post", data: query });
}

export async function GetCommissionLogs(query: any) {
  return await request({ url: "/invite/commission/page", method: "post", data: query });
}
