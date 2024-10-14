import { request } from "/src/api/service";

const apiPrefix = "/sys/plugin";

export async function GetList(query: any) {
  return await request({
    url: apiPrefix + "/page",
    method: "post",
    data: query
  });
}

export async function AddObj(obj: any) {
  return await request({
    url: apiPrefix + "/add",
    method: "post",
    data: obj
  });
}

export async function UpdateObj(obj: any) {
  return await request({
    url: apiPrefix + "/update",
    method: "post",
    data: obj
  });
}

export async function DelObj(id: any) {
  return await request({
    url: apiPrefix + "/delete",
    method: "post",
    params: { id }
  });
}

export async function GetObj(id: any) {
  return await request({
    url: apiPrefix + "/info",
    method: "post",
    params: { id }
  });
}

export async function GetDetail(id: any) {
  return await request({
    url: apiPrefix + "/detail",
    method: "post",
    params: { id }
  });
}

export async function DeleteBatch(ids: any[]) {
  return await request({
    url: apiPrefix + "/deleteByIds",
    method: "post",
    data: { ids }
  });
}

export async function SetDisabled(data: { id?: number; name?: string; type?: string; disabled: boolean }) {
  return await request({
    url: apiPrefix + "/setDisabled",
    method: "post",
    data: data
  });
}

export type PluginConfigBean = {
  name: string;
  disabled: boolean;
  sysSetting: {
    input?: Record<string, any>;
  };
};

export type CertApplyPluginSysInput = {
  googleCommonEabAccessId: number;
};
export type PluginSysSetting<T> = {
  sysSetting: {
    input?: T;
  };
};
export type CommPluginConfig = {
  CertApply?: PluginSysSetting<CertApplyPluginSysInput>;
};

export async function GetCommPluginConfigs(): Promise<CommPluginConfig> {
  return await request({
    url: apiPrefix + "/getCommPluginConfigs",
    method: "post"
  });
}

export async function SaveCommPluginConfigs(data: CommPluginConfig): Promise<void> {
  return await request({
    url: apiPrefix + "/saveCommPluginConfigs",
    method: "post",
    data
  });
}
