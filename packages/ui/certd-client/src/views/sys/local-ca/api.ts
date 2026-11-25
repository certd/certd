import { request } from "/src/api/service";
import { getSecretAccessToken } from "/@/views/certd/access/api";
import { ReadCertDetail } from "/@/views/certd/pipeline/api";

const apiPrefix = "/sys/local-ca";

// 本地CA错误由对话框/组件统一提示，避免全局拦截器重复弹窗
const req = (config: any) => request({ ...config, showErrorNotify: false });

export const localCaApi = {
  async GetList(query: any) {
    return await req({
      url: apiPrefix + "/page",
      method: "post",
      data: query,
    });
  },

  async Generate(data: any) {
    return await req({
      url: apiPrefix + "/generate",
      method: "post",
      data,
    });
  },

  async Import(data: any) {
    return await req({
      url: apiPrefix + "/import",
      method: "post",
      data: { ...data, verifyToken: getSecretAccessToken() },
    });
  },

  async CheckImportDuplicate(data: { certPem: string; parentId?: number }) {
    return await req({
      url: apiPrefix + "/import/check",
      method: "post",
      data,
    });
  },

  async CreateIntermediate(data: any) {
    return await req({
      url: apiPrefix + "/intermediate",
      method: "post",
      data,
    });
  },

  async UpdateObj(data: any) {
    return await req({
      url: apiPrefix + "/update",
      method: "post",
      data: { ...data, verifyToken: getSecretAccessToken() },
    });
  },

  async Archive(id: number, force = false, verifyToken?: string) {
    return await req({
      url: apiPrefix + "/archive",
      method: "post",
      data: { id, force, verifyToken: verifyToken || getSecretAccessToken() },
    });
  },

  async GetObj(id: number) {
    return await req({
      url: apiPrefix + "/info",
      method: "post",
      params: { id },
    });
  },

  async Disable(id: number, disabled: boolean, verifyToken?: string) {
    return await req({
      url: apiPrefix + "/disable",
      method: "post",
      data: { id, disabled, verifyToken },
    });
  },

  async EnableAcme(id: number, enabled: boolean, verifyToken?: string, mode?: "local" | "standard") {
    return await req({
      url: apiPrefix + "/acme",
      method: "post",
      data: { id, enabled, verifyToken, mode },
    });
  },

  async GetOptions(searchKey?: string) {
    return await req({
      url: apiPrefix + "/options",
      method: "post",
      data: { searchKey },
    });
  },

  async GetAdminOptions(searchKey?: string) {
    return await req({
      url: apiPrefix + "/adminOptions",
      method: "post",
      data: { searchKey },
    });
  },

  async GetOptionsByIds(ids: number[]) {
    return await req({
      url: apiPrefix + "/getOptionsByIds",
      method: "post",
      data: { ids },
    });
  },

  async GetCertDetail(certPem: string) {
    return await ReadCertDetail(certPem);
  },

  async GetCertBySerial(id: number, serial: string) {
    return await req({
      url: apiPrefix + "/certBySerial",
      method: "post",
      data: { id, serial },
    });
  },

  async GetArchivedInfo(id: number) {
    return await req({
      url: apiPrefix + "/archived/info",
      method: "post",
      data: { id },
    });
  },

  async ListAcmeAccounts(id: number) {
    return await req({
      url: apiPrefix + "/acme/accounts",
      method: "post",
      data: { id },
    });
  },

  async ListAcmeOrders(id: number, accountId: string) {
    return await req({
      url: apiPrefix + "/acme/accountOrders",
      method: "post",
      data: { id, accountId },
    });
  },

  async SetAcmeAccountStatus(id: number, accountId: string, status: string, verifyToken?: string) {
    return await req({
      url: apiPrefix + "/acme/accountStatus",
      method: "post",
      data: { id, accountId, status, verifyToken },
    });
  },

  async CreateEab(data: any) {
    return await req({
      url: apiPrefix + "/eab/create",
      method: "post",
      data: { ...data, verifyToken: getSecretAccessToken() },
    });
  },

  async ListEab(id: number) {
    return await req({
      url: apiPrefix + "/eab/list",
      method: "post",
      data: { caId: id },
    });
  },

  async GetPublicKey(id: number) {
    return await req({
      url: apiPrefix + "/publicKey",
      method: "post",
      data: { id },
    });
  },

  async GetCrlInfo(id: number) {
    return await req({
      url: apiPrefix + "/crlInfo",
      method: "get",
      params: { id },
    });
  },

  async Export(id: number, verifyToken: string) {
    return await req({
      url: apiPrefix + "/export",
      method: "post",
      data: { id, verifyToken },
    });
  },

  async UpdateEab(data: any) {
    return await req({
      url: apiPrefix + "/eab/update",
      method: "post",
      data: { ...data, verifyToken: getSecretAccessToken() },
    });
  },

  async SetEabStatus(caId: number, eabId: string, disabled: boolean, verifyToken: string) {
    return await req({
      url: apiPrefix + "/eab/status",
      method: "post",
      data: { caId, eabId, disabled, verifyToken },
    });
  },

  async GetAcmeAccess(id: number) {
    return await req({
      url: apiPrefix + "/acme/access/get",
      method: "post",
      data: { id },
    });
  },

  async SetAcmeAccess(id: number, data: any, verifyToken: string) {
    return await req({
      url: apiPrefix + "/acme/access",
      method: "post",
      data: { id, ...data, verifyToken },
    });
  },

  async SetEabPrivileged(caId: number, eabId: string, privileged: boolean, verifyToken: string) {
    return await req({
      url: apiPrefix + "/eab/privileged",
      method: "post",
      data: { caId, eabId, privileged, verifyToken },
    });
  },

  async RotateIntermediate(data: any) {
    return await req({
      url: apiPrefix + "/intermediate/rotate",
      method: "post",
      data: { ...data, verifyToken: getSecretAccessToken() },
    });
  },

  async RevokeIntermediate(id: number, verifyToken: string) {
    return await req({
      url: apiPrefix + "/intermediate/revoke",
      method: "post",
      data: { id, verifyToken },
    });
  },

  async RefreshRootCrl(id: number, verifyToken: string) {
    return await req({
      url: apiPrefix + "/crl/refresh",
      method: "post",
      data: { id, verifyToken },
    });
  },

  async ListArchivedRoots() {
    return await req({
      url: apiPrefix + "/archived/roots",
      method: "post",
      data: {},
    });
  },

  async RefreshArchivedRootCrl(id: number, verifyToken: string) {
    return await req({
      url: apiPrefix + "/crl/refreshArchived",
      method: "post",
      data: { id, verifyToken },
    });
  },

  async ListCerts(id: number) {
    return await req({
      url: apiPrefix + "/certs",
      method: "post",
      data: { id },
    });
  },

  async RevokeCert(id: number, certId: number) {
    return await req({
      url: apiPrefix + "/revokeCert",
      method: "post",
      data: { id, certId, verifyToken: getSecretAccessToken() },
    });
  },
  async ListGrants(id: number) {
    return await req({
      url: apiPrefix + "/grants/list",
      method: "post",
      data: { id },
    });
  },

  async AddGrant(data: any) {
    return await req({
      url: apiPrefix + "/grants/add",
      method: "post",
      data: { ...data, verifyToken: getSecretAccessToken() },
    });
  },

  async RemoveGrant(id: number, grantId: number) {
    return await req({
      url: apiPrefix + "/grants/remove",
      method: "post",
      data: { id, grantId, verifyToken: getSecretAccessToken() },
    });
  },

  async ListAdmins(id: number) {
    return await req({
      url: apiPrefix + "/admins/list",
      method: "post",
      data: { id },
    });
  },

  async AddAdmin(data: any) {
    return await req({
      url: apiPrefix + "/admins/add",
      method: "post",
      data: { ...data, verifyToken: getSecretAccessToken() },
    });
  },

  async RemoveAdmin(id: number, adminUserId: number) {
    return await req({
      url: apiPrefix + "/admins/remove",
      method: "post",
      data: { id, adminUserId, verifyToken: getSecretAccessToken() },
    });
  },
};
