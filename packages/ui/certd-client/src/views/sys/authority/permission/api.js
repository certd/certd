import { request } from "/src/api/service";
const apiPrefix = "/sys/authority/permission";
export async function GetList(query) {
  return request({
    url: apiPrefix + "/page",
    method: "post",
    data: query
  });
}

export async function GetTree() {
  return request({
    url: apiPrefix + "/tree",
    method: "post"
  });
}

export async function AddObj(obj) {
  return request({
    url: apiPrefix + "/add",
    method: "post",
    data: obj
  });
}

export async function UpdateObj(obj) {
  return request({
    url: apiPrefix + "/update",
    method: "post",
    data: obj
  });
}

export async function DelObj(id) {
  return request({
    url: apiPrefix + "/delete",
    method: "post",
    params: { id }
  });
}

export async function GetObj(id) {
  return request({
    url: apiPrefix + "/info",
    method: "post",
    params: { id }
  });
}
