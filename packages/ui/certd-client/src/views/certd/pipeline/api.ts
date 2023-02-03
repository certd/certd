import { request } from "/src/api/service";
const apiPrefix = "/pi/pipeline";

export function GetList(query) {
  return request({
    url: apiPrefix + "/page",
    method: "post",
    data: query
  });
}

export function AddObj(obj) {
  return request({
    url: apiPrefix + "/add",
    method: "post",
    data: obj
  });
}

export function UpdateObj(obj) {
  return request({
    url: apiPrefix + "/update",
    method: "post",
    data: obj
  });
}

export function DelObj(id) {
  return request({
    url: apiPrefix + "/delete",
    method: "post",
    params: { id }
  });
}

export function GetObj(id) {
  return request({
    url: apiPrefix + "/info",
    method: "post",
    params: { id }
  });
}

export function GetDetail(id) {
  return request({
    url: apiPrefix + "/detail",
    method: "post",
    params: { id }
  });
}

export function Save(pipelineEntity) {
  return request({
    url: apiPrefix + "/save",
    method: "post",
    data: pipelineEntity
  });
}

export function Trigger(id) {
  return request({
    url: apiPrefix + "/trigger",
    method: "post",
    params: { id }
  });
}
