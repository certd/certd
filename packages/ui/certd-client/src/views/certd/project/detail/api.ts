import { request } from "/src/api/service";

const apiPrefix = "/enterprise/projectMember";
const userApiPrefix = "/sys/authority/user";
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

export async function GetUserSimpleByIds(query: any) {
  return await request({
    url: userApiPrefix + "/getSimpleByIds",
    method: "post",
    data: query,
  });
}

export async function ApproveJoin(id: any) {
  return await request({
    url: "/enterprise/project/approveJoin",
    method: "post",
    data: {
      id,
    },
  });
}
