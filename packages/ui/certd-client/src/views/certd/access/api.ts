import { request } from "/src/api/service";
const apiPrefix = "/pi/access";
export function GetList(query: any) {
  return request({
    url: apiPrefix + "/page",
    method: "post",
    data: query
  });
}

export function AddObj(obj: any) {
  return request({
    url: apiPrefix + "/add",
    method: "post",
    data: obj
  });
}

export function UpdateObj(obj: any) {
  return request({
    url: apiPrefix + "/update",
    method: "post",
    data: obj
  });
}

export function DelObj(id: number) {
  return request({
    url: apiPrefix + "/delete",
    method: "post",
    params: { id }
  });
}

export function GetObj(id: number) {
  return request({
    url: apiPrefix + "/info",
    method: "post",
    params: { id }
  });
}

export function GetProviderDefine(type: string) {
  return request({
    url: apiPrefix + "/define",
    method: "post",
    params: { type }
  });
}

export function GetProviderDefineByAccessType(type: string) {
  return request({
    url: apiPrefix + "/defineByAccessType",
    method: "post",
    params: { type }
  });
}
