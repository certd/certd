import { request } from "/src/api/service";

const apiPrefix = "/sys/pipeline";

export const sysPipelineApi = {
  async GetList(query: any) {
    return await request({
      url: apiPrefix + "/page",
      method: "post",
      data: query,
    });
  },

  async DelObj(id: number) {
    return await request({
      url: apiPrefix + "/delete",
      method: "post",
      params: { id },
    });
  },

  async BatchDelObj(ids: number[]) {
    return await request({
      url: apiPrefix + "/batchDelete",
      method: "post",
      data: { ids },
    });
  },

  async GetSimpleUserByIds(ids: number[]) {
    return await request({
      url: "/sys/authority/user/getSimpleUserByIds",
      method: "post",
      data: { ids },
    });
  },
};
