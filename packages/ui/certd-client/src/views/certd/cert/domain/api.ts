import { request } from "/src/api/service";

const apiPrefix = "/cert/domain";

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

export async function DelObj(id: any) {
  return await request({
    url: apiPrefix + "/delete",
    method: "post",
    params: { id },
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

export async function DeleteBatch(ids: any[]) {
  return await request({
    url: apiPrefix + "/deleteByIds",
    method: "post",
    data: { ids },
  });
}

export async function ImportTaskSave(body: any) {
  return await request({
    url: apiPrefix + "/import/save",
    method: "post",
    data: body,
  });
}
export async function ImportTaskStatus() {
  return await request({
    url: apiPrefix + "/import/status",
    method: "post",
  });
}
export async function ImportTaskDelete(key: string) {
  return await request({
    url: apiPrefix + "/import/delete",
    method: "post",
    data: { key },
  });
}
export async function ImportTaskStart(key: string) {
  return await request({
    url: apiPrefix + "/import/start",
    method: "post",
    data: { key },
  });
}

export async function SyncExpirationStart() {
  return await request({
    url: apiPrefix + "/sync/expiration/start",
    method: "post",
  });
}

export async function SyncExpirationStatus() {
  return await request({
    url: apiPrefix + "/sync/expiration/status",
    method: "post",
  });
}

export async function IsSubdomain(body: any) {
  return await request({
    url: apiPrefix + "/isSubdomain",
    method: "post",
    data: body,
  });
}
