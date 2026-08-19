import { request } from "/src/api/service";
import { CertInfo } from "/@/views/certd/pipeline/api";

const apiPrefix = "/monitor/cert";
export const certInfoApi = {
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
  async Upload(body: { id?: number; cert: { crt: string; key: string } }) {
    return await request({
      url: apiPrefix + "/upload",
      method: "post",
      data: body,
    });
  },
  async GetCert(id: number): Promise<CertInfo> {
    return await request({
      url: apiPrefix + "/getCert",
      method: "post",
      params: { id: id },
    });
  },

  async Revoke(id: number) {
    return await request({
      url: apiPrefix + "/revoke",
      method: "post",
      data: { id },
    });
  },

  async GetOptionsByIds(ids: number[]): Promise<any[]> {
    return await request({
      url: apiPrefix + "/getOptionsByIds",
      method: "post",
      data: { ids },
    });
  },
};
