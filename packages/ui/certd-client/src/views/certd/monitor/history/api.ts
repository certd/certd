import { request } from "/src/api/service";

const apiPrefix = "/monitor/job-history";

export const jobHistoryApi = {
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

  async GetObj(id: number) {
    return await request({
      url: apiPrefix + "/info",
      method: "post",
      params: { id },
    });
  },
};
