import { request } from "/src/api/service";

const apiPrefix = "/cert/apply-template";

export async function GetList(query: any) {
  return await request({
    url: apiPrefix + "/page",
    method: "post",
    data: query,
  });
}

export async function ListAll() {
  return await request({
    url: apiPrefix + "/list",
    method: "post",
    data: {},
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

export async function DelObj(id: number) {
  return await request({
    url: apiPrefix + "/delete",
    method: "post",
    params: { id },
  });
}

export async function GetObj(id: number) {
  return await request({
    url: apiPrefix + "/info",
    method: "post",
    params: { id },
  });
}

export async function SetDefault(id: number) {
  return await request({
    url: apiPrefix + "/setDefault",
    method: "post",
    data: { id },
  });
}

export async function GetDefault() {
  return await request({
    url: apiPrefix + "/default",
    method: "post",
  });
}
