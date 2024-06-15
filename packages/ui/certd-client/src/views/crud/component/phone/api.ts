import { requestForMock } from "/src/api/service";
const request = requestForMock;
const apiPrefix = "/mock/ComponentPhone";
export function GetList(query: any) {
  return request({
    url: apiPrefix + "/page",
    method: "get",
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
    url: apiPrefix + "/get",
    method: "get",
    params: { id }
  });
}

export function GetByIds(ids: any) {
  return request({
    url: apiPrefix + "/byIds",
    method: "post",
    data: { ids }
  });
}
