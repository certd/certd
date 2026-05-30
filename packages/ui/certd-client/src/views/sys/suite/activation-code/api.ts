import { request } from "/src/api/service";

const apiPrefix = "/sys/suite/activation-code";

export async function GetList(query: any) {
  return await request({
    url: apiPrefix + "/page",
    method: "post",
    data: query,
  });
}

export async function Generate(data: { productId: number; duration: number; count: number; expireTime?: number; exported?: boolean; remark?: string }) {
  return await request({
    url: apiPrefix + "/generate",
    method: "post",
    data,
  });
}

export async function ExportCodes(query: any) {
  return await request({
    url: apiPrefix + "/export",
    method: "post",
    data: query,
  });
}

export async function Disable(id: number) {
  return await request({
    url: apiPrefix + "/disable",
    method: "post",
    params: { id },
  });
}

export async function Enable(id: number) {
  return await request({
    url: apiPrefix + "/enable",
    method: "post",
    params: { id },
  });
}

export async function DeleteObj(id: number) {
  return await request({
    url: apiPrefix + "/delete",
    method: "post",
    params: { id },
  });
}

export async function GetSimpleUserByIds(ids: number[]) {
  return await request({
    url: "/sys/authority/user/getSimpleUserByIds",
    method: "post",
    data: { ids },
  });
}

export async function GetProductDetail(id: number) {
  return await request({
    url: "/sys/suite/product/info",
    method: "post",
    params: { id },
  });
}
