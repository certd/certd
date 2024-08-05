import { request } from "/src/api/service";

const apiPrefix = "/pi/history";

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

export function DelObj(id: any) {
  return request({
    url: apiPrefix + "/delete",
    method: "post",
    params: { id }
  });
}

export function GetObj(id: any) {
  return request({
    url: apiPrefix + "/info",
    method: "post",
    params: { id }
  });
}

export function GetDetail(id: any) {
  return request({
    url: apiPrefix + "/detail",
    method: "post",
    params: { id }
  });
}

export function DeleteBatch(ids: any[]) {
  return request({
    url: apiPrefix + "/deleteByIds",
    method: "post",
    data: { ids }
  });
}
