//@ts-ignore
import { requestForMock } from "/src/api/service";
const request = requestForMock;
const apiPrefix = "/mock/FsCrudFirst";

/**
 * 定义行数据模型
 */
export type TsTestRow = {
  id?: number;
  name?: string;
  type?: number;
  compute?: string;
};

export function GetList(query: TsTestRow) {
  return request({
    url: apiPrefix + "/page",
    method: "get",
    data: query
  });
}

export function AddObj(obj: TsTestRow) {
  return request({
    url: apiPrefix + "/add",
    method: "post",
    data: obj
  });
}

export function UpdateObj(obj: TsTestRow) {
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
