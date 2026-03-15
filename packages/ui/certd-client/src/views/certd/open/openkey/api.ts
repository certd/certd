import { request } from "/src/api/service";

export const OPEN_API_DOC = "https://apifox.com/apidoc/shared-2e76f8c4-7c58-413b-a32d-a1316529af44/254949529e0";

const apiPrefix = "/open/key";
export const openkeyApi = {
  async GetList(query: any) {
    return await request({
      url: apiPrefix + "/page",
      method: "post",
      data: query,
    });
  },

  async AddObj(obj: any) {
    return await request({
      url: apiPrefix + "/add",
      method: "post",
      data: obj,
    });
  },

  async UpdateObj(obj: any) {
    return await request({
      url: apiPrefix + "/update",
      method: "post",
      data: obj,
    });
  },

  async DelObj(id: number) {
    return await request({
      url: apiPrefix + "/delete",
      method: "post",
      params: { id },
    });
  },

  async GetObj(id: number) {
    return await request({
      url: apiPrefix + "/info",
      method: "post",
      params: { id },
    });
  },
  async GetApiToken(id: number) {
    return await request({
      url: apiPrefix + "/getApiToken",
      method: "post",
      data: { id },
    });
  },

  async GetSecret(id: number) {
    return await request({
      url: apiPrefix + "/getSecret",
      method: "post",
      data: { id },
    });
  },
};
