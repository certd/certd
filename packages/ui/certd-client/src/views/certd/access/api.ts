import { request } from "/src/api/service";
const apiPrefix = "/pi/access";
export async function GetList(query: any) {
  return await request({
    url: apiPrefix + "/page",
    method: "post",
    data: query
  });
}

export async function AddObj(obj: any) {
  return await request({
    url: apiPrefix + "/add",
    method: "post",
    data: obj
  });
}

export async function UpdateObj(obj: any) {
  return await request({
    url: apiPrefix + "/update",
    method: "post",
    data: obj
  });
}

export async function DelObj(id: number) {
  return await request({
    url: apiPrefix + "/delete",
    method: "post",
    params: { id }
  });
}

export async function GetObj(id: number) {
  return await request({
    url: apiPrefix + "/info",
    method: "post",
    params: { id }
  });
}

export async function GetProviderDefine(type: string) {
  return await request({
    url: apiPrefix + "/define",
    method: "post",
    params: { type }
  });
}

export async function GetProviderDefineByAccessType(type: string) {
  return await request({
    url: apiPrefix + "/defineByAccessType",
    method: "post",
    params: { type }
  });
}
