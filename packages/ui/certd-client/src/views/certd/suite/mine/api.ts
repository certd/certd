import { request } from "/src/api/service";

const apiPrefix = "/mine/suite";

export type SuiteValue = {
  max: number;
  used: number;
};
export type SuiteDetail = {
  enabled?: boolean;
  suites?: any[];
  suiteList?: any[];
  addonList?: any[];
  expiresTime?: number;
  pipelineCount?: SuiteValue;
  domainCount?: SuiteValue;
  wildcardDomainCount?: SuiteValue;
  deployCount?: SuiteValue;
  monitorCount?: SuiteValue;
};

export const mySuiteApi = {
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
  async ListAll() {
    return await request({
      url: apiPrefix + "/all",
      method: "post",
    });
  },
  async SuiteDetailGet() {
    return await request({
      url: `${apiPrefix}/detail`,
      method: "post",
    });
  },
};
