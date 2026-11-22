import { request } from "/src/api/service";
import { ReadCertDetail } from "/@/views/certd/pipeline/api";

const apiPrefix = "/cert/local-ca";

export const localCaApi = {
  async GetList(query: any) {
    return await request({
      url: apiPrefix + "/page",
      method: "post",
      data: query,
    });
  },

  async Generate(data: any) {
    return await request({
      url: apiPrefix + "/generate",
      method: "post",
      data,
    });
  },

  async Import(data: any) {
    return await request({
      url: apiPrefix + "/import",
      method: "post",
      data,
    });
  },

  async CreateIntermediate(data: any) {
    return await request({
      url: apiPrefix + "/intermediate",
      method: "post",
      data,
    });
  },

  async UpdateObj(data: any) {
    return await request({
      url: apiPrefix + "/update",
      method: "post",
      data,
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

  async Disable(id: number, disabled: boolean) {
    return await request({
      url: apiPrefix + "/disable",
      method: "post",
      data: { id, disabled },
    });
  },

  async EnableAcme(id: number, enabled: boolean) {
    return await request({
      url: apiPrefix + "/acme",
      method: "post",
      data: { id, enabled },
    });
  },

  async GetOptions(searchKey?: string) {
    return await request({
      url: apiPrefix + "/options",
      method: "post",
      data: { searchKey },
    });
  },

  async GetOptionsByIds(ids: number[]) {
    return await request({
      url: apiPrefix + "/getOptionsByIds",
      method: "post",
      data: { ids },
    });
  },

  async GetCertDetail(certPem: string) {
    return await ReadCertDetail(certPem);
  },

  async Export(id: number, verifyToken: string) {
    return await request({
      url: apiPrefix + "/export",
      method: "post",
      data: { id, verifyToken },
    });
  },

  async ListCerts(id: number) {
    return await request({
      url: apiPrefix + "/certs",
      method: "post",
      data: { id },
    });
  },

  async RevokeCert(id: number, certId: number) {
    return await request({
      url: apiPrefix + "/revokeCert",
      method: "post",
      data: { id, certId },
    });
  },
};
