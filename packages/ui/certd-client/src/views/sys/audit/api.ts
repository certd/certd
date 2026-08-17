import { request } from "/src/api/service";

const apiPrefix = "/sys/audit";

export function createSysAuditApi() {
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
    async Clean(retentionDays: number) {
      return await request({
        url: apiPrefix + "/clean",
        method: "post",
        data: { retentionDays },
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
