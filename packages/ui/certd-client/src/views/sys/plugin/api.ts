import { request } from "/src/api/service";

const apiPrefix = "/sys/plugin";

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

export async function GetObj(id: any) {
  return await request({
    url: apiPrefix + "/info",
    method: "post",
    params: { id },
  });
}

export async function GetDetail(id: any) {
  return await request({
    url: apiPrefix + "/detail",
    method: "post",
    params: { id },
  });
}

export async function DeleteBatch(ids: any[]) {
  return await request({
    url: apiPrefix + "/deleteByIds",
    method: "post",
    data: { ids },
  });
}

export async function SetDisabled(data: { id?: number; name?: string; type?: string; disabled: boolean }) {
  return await request({
    url: apiPrefix + "/setDisabled",
    method: "post",
    data: data,
  });
}

export async function ExportPlugin(id: number) {
  return await request({
    url: apiPrefix + "/export",
    method: "post",
    data: { id },
  });
}

export async function ImportPlugin(body: any) {
  return await request({
    url: apiPrefix + "/import",
    method: "post",
    data: body,
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
  googleCommonEabAccessId?: number;
  zerosslCommonEabAccessId?: number;
  litesslCommonEabAccessId?: number;
};
export type PluginSysSetting<T> = {
  sysSetting: {
    input?: T;
    metadata?: Record<string, any>;
  };
};
export type CommPluginConfig = {
  CertApply?: PluginSysSetting<CertApplyPluginSysInput>;
};

export async function GetCommPluginConfigs(): Promise<CommPluginConfig> {
  return await request({
    url: apiPrefix + "/getCommPluginConfigs",
    method: "post",
  });
}

export async function SaveCommPluginConfigs(data: CommPluginConfig): Promise<void> {
  return await request({
    url: apiPrefix + "/saveCommPluginConfigs",
    method: "post",
    data,
  });
}

export async function savePluginSetting(req: { name: string; sysSetting: any }): Promise<void> {
  return await request({
    url: apiPrefix + "/saveSetting",
    method: "post",
    data: req,
  });
}

export async function DoTest(req: { id: number; input: any }): Promise<void> {
  return await request({
    url: apiPrefix + "/doTest",
    method: "post",
    data: req,
  });
}

export async function GetPluginByName(name: string): Promise<PluginConfigBean> {
  return await request({
    url: apiPrefix + "/getPluginByName",
    method: "post",
    data: { name },
  });
}
