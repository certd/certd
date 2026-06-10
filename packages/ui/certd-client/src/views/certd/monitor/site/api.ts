import { request } from "/src/api/service";

const apiPrefix = "/monitor/site";

export const siteInfoApi = {
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
  async DoCheck(id: number) {
    return await request({
      url: apiPrefix + "/check",
      method: "post",
      data: { id },
    });
  },
  async CheckAll() {
    return await request({
      url: apiPrefix + "/checkAll",
      method: "post",
    });
  },

  async Import(form: any) {
    return await request({
      url: apiPrefix + "/import",
      method: "post",
      data: form,
    });
  },

  async ImportTaskSave(body: any) {
    return await request({
      url: apiPrefix + "/import/save",
      method: "post",
      data: body,
    });
  },
  async ImportTaskStatus() {
    return await request({
      url: apiPrefix + "/import/status",
      method: "post",
    });
  },
  async ImportTaskDelete(key: string) {
    return await request({
      url: apiPrefix + "/import/delete",
      method: "post",
      data: { key },
    });
  },
  async ImportTaskStart(key: string) {
    return await request({
      url: apiPrefix + "/import/start",
      method: "post",
      data: { key },
    });
  },



  async DisabledChange(id: number, disabled: boolean) {
    return await request({
      url: apiPrefix + "/disabledChange",
      method: "post",
      data: {
        id,
        disabled,
      },
    });
  },
  async IpCheckChange(id: number, ipCheck: boolean) {
    return await request({
      url: apiPrefix + "/ipCheckChange",
      method: "post",
      data: {
        id,
        ipCheck,
      },
    });
  },
};
