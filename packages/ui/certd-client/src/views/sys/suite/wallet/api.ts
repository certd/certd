import { request } from "/src/api/service";

const apiPrefix = "/sys/wallet";

export async function GetList(query: any) {
  return await request({
    url: apiPrefix + "/page",
    method: "post",
    data: query,
  });
}

export async function Recharge(data: { userId: number; amount: number; remark?: string }) {
  return await request({
    url: apiPrefix + "/recharge",
    method: "post",
    data,
  });
}

export async function GetWalletLogs(query: any) {
  return await request({
    url: apiPrefix + "/log/page",
    method: "post",
    data: query,
  });
}

export async function GetSimpleUserByIds(ids: number[]) {
  return await request({
    url: "/sys/authority/user/getSimpleUserByIds",
    method: "post",
    data: { ids },
  });
}
