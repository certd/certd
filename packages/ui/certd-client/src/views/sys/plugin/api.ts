import { request } from "/src/api/service";

const apiPrefix = "/sys/plugin";

export async function GetList(query: any) {
  return await request({
    url: apiPrefix + "/page",
    method: "post",
    data: query,
  });
}

export async function FindPlugins(query: {
  type?: "builtIn" | "store";
  pluginType?: string;
  group?: string;
  name?: string;
  author?: string;
  keyword?: string;
  keywords?: string[];
  includeBuiltIn?: boolean;
  includeStore?: boolean;
}) {
  return await request({
    url: apiPrefix + "/find",
    method: "post",
    data: query,
  });
}

export async function GetScopedAccessToken(scoped: string[]): Promise<{ token: string; expire: number; scoped: string[] }> {
  return await request({
    url: "/sys/basic/getScopedAccessToken",
    method: "post",
    data: { scoped },
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

export type OnlinePluginBean = {
  id?: number;
  appId?: number;
  developerId?: number;
  author?: string;
  type?: string;
  pluginType?: string;
  name?: string;
  fullName?: string;
  title?: string;
  icon?: string;
  group?: string;
  desc?: string;
  latest?: string;
  status?: string;
  downloadCount?: number;
  score?: number;
  aiCheckStatus?: string;
  vip?: string;
  editable?: boolean;
  selfAuthored?: boolean;
  installed?: boolean;
  installedVersion?: string;
  upgradeAvailable?: boolean;
  localPluginId?: number;
  localDisabled?: boolean;
  localEditable?: boolean;
  syncTime?: number;
};

export type OnlinePluginVersionBean = {
  id?: number;
  pluginId?: number;
  version?: string;
  minAppVersion?: string;
  maxAppVersion?: string;
  status?: string;
  publishedAt?: number;
  reviewStatus?: string;
  reviewReason?: string;
  reviewedAt?: number;
  aiCheckStatus?: string;
  aiCheckResult?: string;
};

export async function OnlinePluginList(body: { pluginType?: string; group?: string; keyword?: string }): Promise<OnlinePluginBean[]> {
  return await request({
    url: apiPrefix + "/online/list",
    method: "post",
    data: body,
  });
}

export async function OnlinePluginSync(): Promise<OnlinePluginBean[]> {
  return await request({
    url: apiPrefix + "/online/sync",
    method: "post",
  });
}

export async function OnlinePluginSetting(): Promise<{ lastSyncTime?: number }> {
  return await request({
    url: apiPrefix + "/online/setting",
    method: "post",
  });
}

export async function OnlinePluginInstall(body: { fullName: string; version?: string }, options?: { showErrorNotify?: boolean }) {
  return await request({
    url: apiPrefix + "/online/install",
    method: "post",
    data: body,
    showErrorNotify: options?.showErrorNotify,
  });
}

export async function OnlinePluginUninstall(id: number) {
  return await request({
    url: apiPrefix + "/online/uninstall",
    method: "post",
    data: { id },
  });
}

export async function OnlinePluginSubmitVersion(body: { fullName: string; version: string; content: string; minAppVersion?: string; maxAppVersion?: string }) {
  return await request({
    url: apiPrefix + "/online/version/submit",
    method: "post",
    data: body,
  });
}

export async function OnlinePluginPublish(body: { id: number; version?: string; minAppVersion?: string; maxAppVersion?: string }) {
  return await request({
    url: apiPrefix + "/online/publish",
    method: "post",
    data: body,
  });
}

export async function OnlinePluginPublishInfo(body: { id: number }): Promise<{
  localPlugin: OnlinePluginBean;
  authorRegistered?: boolean;
  author?: OnlinePluginAuthorBean;
  marketPlugin?: OnlinePluginBean;
  versions: OnlinePluginVersionBean[];
}> {
  return await request({
    url: apiPrefix + "/online/publish/info",
    method: "post",
    data: body,
  });
}

export type OnlinePluginAuthorBean = {
  id?: number;
  appId?: number;
  appOwnerId?: number;
  developerId?: number;
  name?: string;
  displayName?: string;
  avatar?: string;
  desc?: string;
  status?: string;
};

export async function OnlinePluginAuthorGet(): Promise<{ registered?: boolean; author?: OnlinePluginAuthorBean }> {
  return await request({
    url: apiPrefix + "/online/author/get",
    method: "post",
  });
}

export async function OnlinePluginAuthorAdd(body: { name: string; displayName?: string; avatar?: string; desc?: string }): Promise<OnlinePluginAuthorBean> {
  return await request({
    url: apiPrefix + "/online/author/add",
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
  googleCommonAcmeAccountAccessId?: number;
  zerosslCommonAcmeAccountAccessId?: number;
  litesslCommonAcmeAccountAccessId?: number;
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

export async function GetPluginByName(name: string): Promise<PluginConfigBean> {
  return await request({
    url: apiPrefix + "/getPluginByName",
    method: "post",
    data: { name },
  });
}

export async function ClearRuntimeDeps(): Promise<void> {
  return await request({
    url: "/sys/settings/clearRuntimeDeps",
    method: "post",
  });
}
