import { request } from "/src/api/service";

const apiPrefix = "/cert/dns-persist";

export async function GetList(query: any) {
  return await request({
    url: apiPrefix + "/page",
    method: "post",
    data: query,
  });
}

export async function AddObj(obj: any) {
  return await request({
    url: apiPrefix + "/add",
    method: "post",
    data: obj,
  });
}

export async function UpdateObj(obj: any) {
  return await request({
    url: apiPrefix + "/update",
    method: "post",
    data: obj,
  });
}

export async function DelObj(id: any) {
  return await request({
    url: apiPrefix + "/delete",
    method: "post",
    params: { id },
  });
}

export async function BuildRecord(body: { domain: string; accountUri: string; wildcard?: boolean; persistUntil?: number }) {
  return await request({
    url: apiPrefix + "/build",
    method: "post",
    data: body,
  });
}

export async function GetByDomain(body: { domain: string; caType?: string; acmeAccountAccessId?: number; commonAcmeAccountAccessId?: number; wildcard?: boolean; persistUntil?: number; createOnNotFound?: boolean }) {
  return await request({
    url: apiPrefix + "/getByDomain",
    method: "post",
    data: body,
  });
}

export async function CheckRecord(body: { hostRecord: string; recordValue: string }) {
  return await request({
    url: apiPrefix + "/check",
    method: "post",
    data: body,
  });
}

export async function Verify(id: number) {
  return await request({
    url: apiPrefix + "/verify",
    method: "post",
    data: { id },
  });
}

export async function TriggerVerify(id: number) {
  return await request({
    url: apiPrefix + "/triggerVerify",
    method: "post",
    data: { id },
  });
}

export async function CreateTxt(body: { id: number; dnsProviderType?: string; dnsProviderAccess?: number }) {
  return await request({
    url: apiPrefix + "/createTxt",
    method: "post",
    data: body,
  });
}
