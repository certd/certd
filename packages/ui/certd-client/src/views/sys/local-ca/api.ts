import { request } from "/src/api/service";
import { getSecretAccessToken } from "/@/views/certd/access/api";
import { ReadCertDetail } from "/@/views/certd/pipeline/api";

const apiPrefix = "/sys/local-ca";

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
      data: { ...data, verifyToken: getSecretAccessToken() },
    });
  },

  async CheckImportDuplicate(data: { certPem: string; parentId?: number }) {
    return await request({
      url: apiPrefix + "/import/check",
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
      data: { ...data, verifyToken: getSecretAccessToken() },
    });
  },

  async DelObj(id: number) {
    return await request({
      url: apiPrefix + "/delete",
      method: "post",
      data: { id, verifyToken: getSecretAccessToken() },
    });
  },

  async GetObj(id: number) {
    return await request({
      url: apiPrefix + "/info",
      method: "post",
      params: { id },
    });
  },

  async Disable(id: number, disabled: boolean, verifyToken?: string) {
    return await request({
      url: apiPrefix + "/disable",
      method: "post",
      data: { id, disabled, verifyToken },
    });
  },

  async EnableAcme(id: number, enabled: boolean, verifyToken?: string) {
    return await request({
      url: apiPrefix + "/acme",
      method: "post",
      data: { id, enabled, verifyToken },
    });
  },

  async GetOptions(searchKey?: string) {
    return await request({
      url: apiPrefix + "/options",
      method: "post",
      data: { searchKey },
    });
  },

  async GetAdminOptions(searchKey?: string) {
    return await request({
      url: apiPrefix + "/adminOptions",
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

  async ListAcmeAccounts(id: number) {
    return await request({
      url: apiPrefix + "/acme/accounts",
      method: "post",
      data: { id },
    });
  },

  async ListAcmeOrders(id: number, accountId: string) {
    return await request({
      url: apiPrefix + "/acme/accountOrders",
      method: "post",
      data: { id, accountId },
    });
  },

  async SetAcmeAccountStatus(id: number, accountId: string, status: string) {
    return await request({
      url: apiPrefix + "/acme/accountStatus",
      method: "post",
      data: { id, accountId, status },
    });
  },

  async CreateEab(data: any) {
    return await request({
      url: apiPrefix + "/eab/create",
      method: "post",
      data: { ...data, verifyToken: getSecretAccessToken() },
    });
  },

  async ListEab(id: number) {
    return await request({
      url: apiPrefix + "/eab/list",
      method: "post",
      data: { caId: id },
    });
  },

  async GetPublicKey(id: number) {
    return await request({
      url: apiPrefix + "/publicKey",
      method: "post",
      data: { id },
    });
  },

  async GetCrlInfo(id: number) {
    return await request({
      url: apiPrefix + "/crlInfo",
      method: "get",
      params: { id },
    });
  },

  async Export(id: number, verifyToken: string) {
    return await request({
      url: apiPrefix + "/export",
      method: "post",
      data: { id, verifyToken },
    });
  },

  async SetEabStatus(caId: number, eabId: string, disabled: boolean, verifyToken: string) {
    return await request({
      url: apiPrefix + "/eab/status",
      method: "post",
      data: { caId, eabId, disabled, verifyToken },
    });
  },

  async RevokeIntermediate(id: number, verifyToken: string) {
    return await request({
      url: apiPrefix + "/intermediate/revoke",
      method: "post",
      data: { id, verifyToken },
    });
  },

  async RefreshRootCrl(id: number, verifyToken: string) {
    return await request({
      url: apiPrefix + "/crl/refresh",
      method: "post",
      data: { id, verifyToken },
    });
  },

  async ListArchivedRoots() {
    return await request({
      url: apiPrefix + "/archived/roots",
      method: "post",
      data: {},
    });
  },

  async RefreshArchivedRootCrl(id: number, verifyToken: string) {
    return await request({
      url: apiPrefix + "/crl/refreshArchived",
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
      data: { id, certId, verifyToken: getSecretAccessToken() },
    });
  },
  async ListGrants(id: number) {
    return await request({
      url: apiPrefix + "/grants/list",
      method: "post",
      data: { id },
    });
  },

  async AddGrant(data: any) {
    return await request({
      url: apiPrefix + "/grants/add",
      method: "post",
      data: { ...data, verifyToken: getSecretAccessToken() },
    });
  },

  async RemoveGrant(id: number, grantId: number) {
    return await request({
      url: apiPrefix + "/grants/remove",
      method: "post",
      data: { id, grantId, verifyToken: getSecretAccessToken() },
    });
  },

  async ListAdmins(id: number) {
    return await request({
      url: apiPrefix + "/admins/list",
      method: "post",
      data: { id },
    });
  },

  async AddAdmin(data: any) {
    return await request({
      url: apiPrefix + "/admins/add",
      method: "post",
      data: { ...data, verifyToken: getSecretAccessToken() },
    });
  },

  async RemoveAdmin(id: number, adminUserId: number) {
    return await request({
      url: apiPrefix + "/admins/remove",
      method: "post",
      data: { id, adminUserId, verifyToken: getSecretAccessToken() },
    });
  },
};
