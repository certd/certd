import { request } from "/src/api/service";

const apiPrefix = "/sys/suite/trade";

export async function GetList(query: any) {
  return await request({
    url: apiPrefix + "/page",
    method: "post",
    data: query,
  });
}

export async function AddObj(obj: any) {
  return await request({
    url: apiPrefix + "/add",
    method: "post",
    data: obj,
  });
}

export async function UpdateObj(obj: any) {
  return await request({
    url: apiPrefix + "/update",
    method: "post",
    data: obj,
  });
}

export async function CancelObj(id: any) {
  return await request({
    url: apiPrefix + "/cancel",
    method: "post",
    data: { id },
  });
}

export async function GetObj(id: any) {
  return await request({
    url: apiPrefix + "/info",
    method: "post",
    params: { id },
  });
}

export async function GetDetail(id: any) {
  return await request({
    url: apiPrefix + "/detail",
    method: "post",
    params: { id },
  });
}

export async function UpdatePaid(id: any) {
  return await request({
    url: apiPrefix + "/updatePaid",
    method: "post",
    data: { id },
  });
}

export async function SyncStatus(id: any) {
  return await request({
    url: apiPrefix + "/syncStatus",
    method: "post",
    data: { id },
  });
}
