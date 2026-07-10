import { request } from "/src/api/service";

const apiPrefix = "/pi/audit";

export function createAuditApi() {
  return {
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
    async GetDict() {
      return await request({
        url: apiPrefix + "/dict",
        method: "post",
      });
    },
  };
}
