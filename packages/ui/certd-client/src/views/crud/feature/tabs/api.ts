import { requestForMock } from "/src/api/service";
const request = requestForMock;
const apiPrefix = "/mock/FeatureTabs";
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
    method: "get",
    params: { id }
  });
}
