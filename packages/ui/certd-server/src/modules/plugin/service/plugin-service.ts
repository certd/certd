import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { addonRegistry, BaseService, PageReq, PlusService, SysInstallInfo, SysPluginSetting, SysSettingsService } from "@certd/lib-server";
import { PluginEntity } from "../entity/plugin.js";
import { InjectEntityModel } from "@midwayjs/typeorm";
import { Brackets, IsNull, Like, Not, Repository } from "typeorm";
import { isComm } from "@certd/plus-core";
import { BuiltInPluginService } from "../../pipeline/service/builtin-plugin-service.js";
import { merge } from "lodash-es";
import { dnsProviderRegistry } from "@certd/plugin-cert";
import { logger } from "@certd/basic";
import yaml from "js-yaml";
import { getDefaultAccessPlugin, getDefaultDeployPlugin, getDefaultDnsPlugin } from "./default-plugin.js";
import fs from "fs";
import path from "path";
import { importRuntime as importRuntimeDirect, getRuntimeDepsService, pluginRegistry, accessRegistry, notificationRegistry } from "@certd/pipeline";

export type PluginImportReq = {
  content: string;
  override?: boolean;
  type?: "custom" | "store";
};

export type OnlinePluginListReq = {
  pluginType?: string;
  group?: string;
  keyword?: string;
};

export type PluginFindReq = {
  type?: "builtIn" | "store";
  pluginType?: string;
  group?: string;
  name?: string;
  author?: string;
  keyword?: string;
  keywords?: string[];
  includeBuiltIn?: boolean;
  includeStore?: boolean;
};

export type OnlinePluginInstallReq = {
  fullName: string;
  version?: string;
};

export type OnlinePluginDetailReq = {
  pluginId?: number;
  fullName?: string;
  commentPageNo?: number;
  commentPageSize?: number;
};

export type OnlinePluginVersionSubmitReq = {
  fullName: string;
  version: string;
  content: string;
  minAppVersion?: string;
  maxAppVersion?: string;
};

export type OnlinePluginPublishReq = {
  id: number;
  version?: string;
  minAppVersion?: string;
  maxAppVersion?: string;
};

export type OnlinePluginPublishInfoReq = {
  id: number;
};

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

export type OnlinePluginAuthorGetReply = {
  registered?: boolean;
  author?: OnlinePluginAuthorBean;
};

export type OnlinePluginAuthorAddReq = {
  name: string;
  displayName?: string;
  avatar?: string;
  desc?: string;
};

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

export type OnlinePluginPublishInfo = {
  localPlugin: Partial<PluginEntity>;
  authorRegistered: boolean;
  author?: OnlinePluginAuthorBean;
  marketPlugin?: OnlinePluginBean;
  versions: OnlinePluginVersionBean[];
};

const ONLINE_PLUGIN_SYNC_PAGE_SIZE = 200;

export function parseOnlinePluginFullName(fullName: string) {
  const parts = (fullName || "")
    .trim()
    .split("/")
    .map(item => item.trim());
  if (parts.length !== 2 || !parts[0] || !parts[1] || parts[1].includes(":") || parts[1].includes("/")) {
    throw new Error("插件标识格式错误");
  }
  return {
    author: parts[0],
    name: parts[1],
  };
}

function compareOnlinePluginVersion(current: string, latest: string) {
  const normalize = (version: string) => {
    return (version || "").trim().replace(/^[vV]/, "");
  };
  const currentText = normalize(current);
  const latestText = normalize(latest);
  const currentParts = currentText.split(".");
  const latestParts = latestText.split(".");
  const maxLength = Math.max(currentParts.length, latestParts.length);

  for (let index = 0; index < maxLength; index++) {
    const currentPart = Number(currentParts[index] || 0);
    const latestPart = Number(latestParts[index] || 0);
    if (!Number.isInteger(currentPart) || !Number.isInteger(latestPart)) {
      return currentText.localeCompare(latestText);
    }
    if (currentPart > latestPart) {
      return 1;
    }
    if (currentPart < latestPart) {
      return -1;
    }
  }
  return 0;
}

export function isOnlinePluginUpgradeAvailable(installedVersion?: string, latestVersion?: string) {
  const installed = (installedVersion || "").trim();
  const latest = (latestVersion || "").trim();
  if (!installed || !latest) {
    return false;
  }
  return compareOnlinePluginVersion(installed, latest) < 0;
}

function fillOnlinePluginYamlVersion(content: string, version?: string) {
  const versionText = (version || "").trim();
  if (!versionText) {
    return content;
  }
  const loaded = yaml.load(content);
  if (!loaded || typeof loaded !== "object" || Array.isArray(loaded)) {
    throw new Error("插件 YAML 内容格式错误");
  }
  return yaml.dump(
    {
      ...(loaded as Record<string, any>),
      version: versionText,
    },
    {
      lineWidth: -1,
      noRefs: true,
      sortKeys: false,
    }
  );
}

function isBareModuleSpecifier(modulePath: string) {
  if (modulePath.startsWith(".") || modulePath.startsWith("/") || modulePath.startsWith("file:") || modulePath.startsWith("node:")) {
    return false;
  }
  return !/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(modulePath);
}

function normalizePluginSourceType(type?: string) {
  if (!type || type === "custom") {
    return "store";
  }
  return type;
}

export function canEditStorePlugin(developerId?: number, bindUserId?: number) {
  if (!developerId) {
    return true;
  }
  return !!bindUserId && developerId === bindUserId;
}

export function getPluginFullName(plugin: { fullName?: string; author?: string; name?: string }) {
  const fullName = `${plugin.fullName || ""}`.trim();
  if (fullName) {
    return fullName;
  }

  const name = `${plugin.name || ""}`.trim();
  const author = `${plugin.author || ""}`.trim();
  if (!author || !name || name.startsWith(`${author}/`)) {
    return name;
  }
  return `${author}/${name}`;
}

function getPluginRegistryName(plugin: { fullName?: string; author?: string; name?: string; addonType?: string }) {
  const fullName = getPluginFullName(plugin);
  return plugin.addonType ? `${plugin.addonType}:${fullName}` : fullName;
}

async function importLocalModule(modulePath: string) {
  if (!modulePath) {
    throw new Error("modules path 不能为空");
  }
  if (!modulePath.startsWith("/@/")) {
    return await import(modulePath);
  }
  modulePath = modulePath.replace("/@/", "");
  //替换@为相对地址
  modulePath = `../../../${modulePath}`;
  return await import(modulePath);
}

@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class PluginService extends BaseService<PluginEntity> {
  @InjectEntityModel(PluginEntity)
  repository: Repository<PluginEntity>;

  @Inject()
  builtInPluginService: BuiltInPluginService;

  @Inject("plusService")
  plusService: PlusService;

  @Inject()
  sysSettingsService: SysSettingsService;

  //@ts-ignore
  getRepository() {
    return this.repository;
  }

  private addInstalledPluginOnlyQuery(bq: any) {
    bq.andWhere("(main.type != :storeType OR main.installed = :installed)", {
      storeType: "store",
      installed: true,
    });
  }

  private filterBuiltInList(list: PluginEntity[], query: Partial<PluginEntity>) {
    let records = list;
    if (query.group) {
      records = records.filter(item => item.group === query.group);
    }
    if (query.pluginType) {
      records = records.filter(item => item.pluginType === query.pluginType);
    }
    if (query.name) {
      const keyword = `${query.name}`.trim().toLowerCase();
      records = records.filter(item => (item.name || "").toLowerCase().includes(keyword));
    }
    const keywords = this.normalizePluginFindKeywords(query as any);
    if (keywords.length > 0) {
      records = records.filter(item => {
        return keywords.some(keyword => {
          return [item.name, item.title, item.desc, item.group, item.pluginType].some(value => `${value || ""}`.toLowerCase().includes(keyword));
        });
      });
    }
    return records;
  }

  private normalizePluginFindKeywords(req: PluginFindReq) {
    const values = [...(req.keywords || []), req.keyword || ""];
    return values.map(item => `${item || ""}`.trim().toLowerCase()).filter((item, index, list) => item.length > 0 && list.indexOf(item) === index);
  }

  async findPlugins(req: PluginFindReq = {}) {
    const includeBuiltIn = req.includeBuiltIn ?? req.type !== "store";
    const includeStore = req.includeStore ?? req.type !== "builtIn";
    const records: any[] = [];

    if (includeBuiltIn) {
      const builtInQuery = {
        ...req,
        type: "builtIn",
      };
      const builtInList = this.filterBuiltInList(await this.getBuiltInEntityList(), builtInQuery);
      records.push(
        ...builtInList.map(item => {
          const record = {
            ...item,
            type: "builtIn",
            editable: false,
          };
          delete (record as any).content;
          delete (record as any).setting;
          delete (record as any).sysSetting;
          delete (record as any).metadata;
          delete (record as any).extra;
          return record;
        })
      );
    }

    if (includeStore) {
      const storeQuery: any = {
        type: "store",
      };
      if (req.pluginType) {
        storeQuery.pluginType = req.pluginType;
      }
      if (req.group) {
        storeQuery.group = req.group;
      }
      if (req.name) {
        storeQuery.name = Like(`%${req.name}%`);
      }
      if (req.author) {
        storeQuery.author = req.author;
      }

      let storeWhere: any = storeQuery;
      const keywords = this.normalizePluginFindKeywords(req);
      if (keywords.length > 0) {
        const searchFields = ["fullName", "name", "title", "desc", "group", "pluginType"];
        storeWhere = keywords.flatMap(keyword => {
          const keywordLike = Like(`%${keyword}%`);
          return searchFields.map(field => {
            return {
              ...storeQuery,
              [field]: keywordLike,
            };
          });
        });
      }
      const storeList = await this.find({
        where: storeWhere,
        order: {
          pluginType: "ASC",
          group: "ASC",
          title: "ASC",
          fullName: "ASC",
          id: "ASC",
        } as any,
      });
      let bindUserId = 0;
      if (this.sysSettingsService) {
        const installInfo = await this.sysSettingsService.getSetting<SysInstallInfo>(SysInstallInfo);
        bindUserId = installInfo.bindUserId || 0;
      }
      records.push(
        ...storeList.map(item => {
          return {
            ...this.toOnlinePluginBean(item),
            editable: canEditStorePlugin(item.developerId, bindUserId),
          };
        })
      );
    }

    return records;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async page(pageReq: PageReq<PluginEntity>) {
    pageReq.query = pageReq.query || {};
    const query = pageReq.query as Partial<PluginEntity> & { onlyMine?: boolean };
    const onlyMine = query.onlyMine === true;
    delete query.onlyMine;
    if (onlyMine) {
      const installInfo = await this.sysSettingsService.getSetting<SysInstallInfo>(SysInstallInfo);
      if (!installInfo.bindUserId) {
        return {
          records: [],
          total: 0,
          offset: pageReq.page.offset,
          limit: pageReq.page.limit,
        };
      }
      query.type = "store";
      query.developerId = installInfo.bindUserId;
    }
    if (query.type === "custom") {
      query.type = "store";
    }
    if (query.type && query.type !== "builtIn") {
      const pageRes = await super.page(pageReq);
      if (query.type === "store") {
        pageRes.records = (await this.attachOnlineInstallState(pageRes.records.map(item => this.toOnlinePluginBean(item)))) as any;
      }
      return pageRes;
    }
    //仅查询内置插件
    const offset = pageReq.page.offset;
    const limit = pageReq.page.limit;

    let builtInList = await this.getBuiltInEntityList();
    builtInList = this.filterBuiltInList(builtInList, pageReq.query || {});

    //获取分页数据
    const data = builtInList.slice(offset, offset + limit);

    return {
      records: data,
      total: builtInList.length,
      offset: offset,
      limit: limit,
    };
  }

  async getEnabledBuildInGroup(opts?: { isSimple?: boolean; withSetting?: boolean }) {
    const groups = this.builtInPluginService.getGroups();
    if (opts?.isSimple) {
      for (const key in groups) {
        const group = groups[key];
        group.plugins.forEach(item => {
          delete item.input;
        });
      }
    }

    if (!isComm()) {
      return groups;
    }

    // 初始化设置
    const settingPlugins = await this.find({
      select: {
        id: true,
        name: true,
        sysSetting: true,
      },
      where: {
        sysSetting: Not(IsNull()),
      },
    });
    //合并插件配置
    const pluginSettingMap: any = {};
    for (const item of settingPlugins) {
      if (!item.sysSetting) {
        continue;
      }
      pluginSettingMap[item.name] = JSON.parse(item.sysSetting);
    }
    for (const key in groups) {
      const group = groups[key];
      if (!group.plugins) {
        continue;
      }
      for (const item of group.plugins) {
        const pluginSetting = pluginSettingMap[item.name];
        if (pluginSetting) {
          item.sysSetting = pluginSetting;
        }
      }
    }

    //排除禁用的
    const list = await this.list({
      query: {
        disabled: true,
      },
    });
    const disabledNames = list.map(it => it.name);
    for (const key in groups) {
      const group = groups[key];
      if (!group.plugins) {
        continue;
      }
      group.plugins = group.plugins.filter(it => !disabledNames.includes(it.name));
    }
    return groups;
  }

  async getEnabledBuiltInList(): Promise<any> {
    const builtInList = this.builtInPluginService.getList();
    if (!isComm()) {
      return builtInList;
    }

    const list = await this.list({
      query: {
        type: "builtIn",
        disabled: true,
      },
    });
    const disabledNames = list.map(it => it.name);

    return builtInList.filter(it => {
      return !disabledNames.includes(it.name);
    });
  }

  async getBuiltInEntityList() {
    const builtInList = this.builtInPluginService.getAllList();
    const list = await this.list({
      query: {
        type: "builtIn",
      },
    });

    const records: PluginEntity[] = [];

    for (const item of builtInList) {
      let record = list.find(it => it.name === item.name);
      if (!record) {
        record = new PluginEntity();
        record.disabled = false;
      }
      merge(record, {
        name: item.name,
        title: item.title,
        type: "builtIn",
        icon: item.icon,
        desc: item.desc,
        group: item.group,
      });
      records.push(record);
    }
    return records;
  }

  async setDisabled(opts: { id?: number; name?: string; type: string; disabled: boolean }) {
    const { id, name, type, disabled } = opts;
    if (!type) {
      throw new Error("参数错误: type 不能为空");
    }
    if (id > 0) {
      //update
      await this.updateWhere({ id }, { disabled });
      return;
    }

    if (name && type === "builtIn") {
      const pluginEntity = new PluginEntity();
      pluginEntity.name = name;
      pluginEntity.type = type;
      pluginEntity.disabled = disabled;
      await this.repository.save(pluginEntity);
      return;
    }
    throw new Error("参数错误: id 和 name 必须有一个");
  }

  async getDefineByType(type: string) {
    return this.builtInPluginService.getByType(type);
  }

  /**
   * 新增
   * @param param 数据
   */
  async add(param: any) {
    param.type = normalizePluginSourceType(param.type);
    const old = await this.findOne({
      where: {
        name: param.name,
        author: param.author,
      },
    });

    if (old) {
      throw new Error(`插件${param.author}/${param.name}已存在`);
    }

    if (param.type === "builtIn") {
      return await super.add({
        ...param,
      });
    }

    let plugin: any = {};
    if (param.pluginType === "access") {
      plugin = getDefaultAccessPlugin();
      delete param.group;
    } else if (param.pluginType === "deploy") {
      plugin = getDefaultDeployPlugin();
    } else if (param.pluginType === "dnsProvider") {
      plugin = getDefaultDnsPlugin();
      delete param.group;
    } else {
      throw new Error(`插件类型${param.pluginType}不支持`);
    }

    const res = await super.add({
      ...param,
      ...plugin,
    });

    await this.registerById(res.id);
    return res;
  }

  async registerById(id: any) {
    const item = await this.info(id);
    if (!item) {
      return;
    }
    if (item.type === "builtIn") {
      return;
    }
    await this.registerPlugin(item);
    await this.refreshPluginDeps();
  }

  private getOnlinePluginFullName(item: OnlinePluginBean) {
    if (item.fullName) {
      return item.fullName;
    }
    if (item.author && item.name) {
      return `${item.author}/${item.name}`;
    }
    return "";
  }

  private normalizeOnlinePluginRecord(item: OnlinePluginBean, syncTime: number, old?: PluginEntity) {
    const fullName = this.getOnlinePluginFullName(item);
    return this.repository.create({
      id: old?.id,
      appId: item.appId,
      developerId: item.developerId,
      fullName,
      author: item.author,
      name: item.name,
      pluginType: item.pluginType,
      title: item.title,
      icon: item.icon,
      group: item.group,
      desc: item.desc,
      latest: item.latest,
      status: item.status,
      downloadCount: item.downloadCount,
      score: item.score,
      aiCheckStatus: item.aiCheckStatus,
      vip: item.vip,
      syncTime,
      type: old?.type || "store",
      disabled: old?.disabled ?? false,
      installed: old?.installed ?? false,
      setting: old?.setting,
      sysSetting: old?.sysSetting,
      content: old?.content,
      metadata: old?.metadata,
      extra: old?.extra,
      version: old?.version,
      updateTime: new Date(),
    });
  }

  private toOnlinePluginBean(item: PluginEntity): OnlinePluginBean {
    const isInstalled = item.installed === true;
    return {
      id: item.id,
      appId: item.appId,
      developerId: item.developerId,
      fullName: item.fullName,
      author: item.author,
      type: item.type,
      name: item.name,
      pluginType: item.pluginType,
      title: item.title,
      icon: item.icon,
      group: item.group,
      desc: item.desc,
      latest: item.latest,
      status: item.status,
      downloadCount: item.downloadCount,
      score: item.score,
      aiCheckStatus: item.aiCheckStatus,
      vip: item.vip,
      syncTime: item.syncTime,
      installed: isInstalled,
      localPluginId: isInstalled ? item.id : undefined,
      localDisabled: isInstalled ? item.disabled : undefined,
      installedVersion: isInstalled ? item.version : undefined,
    };
  }

  private async findOnlinePluginRecords(req: OnlinePluginListReq) {
    const query = req || {};
    const keyword = (query.keyword || "").trim().toLowerCase();
    const listQuery: Partial<PluginEntity> = {
      type: "store",
    };
    if (query.pluginType) {
      listQuery.pluginType = query.pluginType;
    }
    if (query.group) {
      listQuery.group = query.group;
    }
    return await this.list({
      query: listQuery,
      buildQuery: builder => {
        if (keyword) {
          builder.andWhere(
            new Brackets(qb => {
              qb.where("LOWER(COALESCE(main.fullName, '')) LIKE :keyword", { keyword: `%${keyword}%` })
                .orWhere("LOWER(main.author) LIKE :keyword", { keyword: `%${keyword}%` })
                .orWhere("LOWER(main.name) LIKE :keyword", { keyword: `%${keyword}%` })
                .orWhere("LOWER(main.title) LIKE :keyword", { keyword: `%${keyword}%` })
                .orWhere("LOWER(main.desc) LIKE :keyword", { keyword: `%${keyword}%` })
                .orWhere("LOWER(main.group) LIKE :keyword", { keyword: `%${keyword}%` })
                .orWhere("LOWER(main.pluginType) LIKE :keyword", { keyword: `%${keyword}%` });
            })
          );
        }
        builder.orderBy("main.pluginType", "ASC").addOrderBy("main.group", "ASC").addOrderBy("main.title", "ASC").addOrderBy("main.fullName", "ASC").addOrderBy("main.id", "ASC");
      },
    });
  }

  private findInstalledOnlinePlugin(installedPlugins: PluginEntity[], parsed: { author: string; name: string }, record: OnlinePluginBean) {
    const fullName = record.fullName || `${parsed.author}/${parsed.name}`;
    return installedPlugins.find(plugin => {
      if (plugin.fullName === fullName || plugin.name === fullName) {
        return true;
      }
      if (plugin.author === parsed.author && plugin.name === parsed.name) {
        return true;
      }
      return !!record.pluginType && plugin.pluginType === record.pluginType && plugin.name === parsed.name;
    });
  }

  private async attachOnlineInstallState(list: OnlinePluginBean[]) {
    const records: OnlinePluginBean[] = [];
    const parsedRecords = new Map<OnlinePluginBean, { author: string; name: string }>();
    let bindUserId = 0;
    if (this.sysSettingsService) {
      const installInfo = await this.sysSettingsService.getSetting<SysInstallInfo>(SysInstallInfo);
      bindUserId = installInfo.bindUserId || 0;
    }
    for (const item of list) {
      const record: OnlinePluginBean = { ...item };
      const fullName = this.getOnlinePluginFullName(record);
      record.fullName = fullName;
      record.selfAuthored = !!bindUserId && record.developerId === bindUserId;
      record.localEditable = canEditStorePlugin(record.developerId, bindUserId);

      let parsed: { author: string; name: string };
      try {
        parsed = parseOnlinePluginFullName(fullName);
      } catch (e) {
        record.installed = !!record.localPluginId;
        record.upgradeAvailable = false;
        records.push(record);
        continue;
      }

      parsedRecords.set(record, parsed);
      records.push(record);
    }

    const installedPlugins =
      parsedRecords.size > 0
        ? await this.find({
            where: {
              type: "store",
              installed: true,
            },
          })
        : [];
    for (const record of records) {
      const parsed = parsedRecords.get(record);
      if (!parsed) {
        continue;
      }
      const localPlugin = this.findInstalledOnlinePlugin(installedPlugins, parsed, record);
      record.installed = !!localPlugin;
      record.localPluginId = localPlugin?.id;
      record.localDisabled = localPlugin?.disabled;
      record.installedVersion = localPlugin?.version;
      record.upgradeAvailable = localPlugin ? isOnlinePluginUpgradeAvailable(localPlugin.version, record.latest) : false;
      record.localEditable = canEditStorePlugin(localPlugin?.developerId ?? record.developerId, bindUserId);
    }
    return records;
  }

  async onlinePluginList(req: OnlinePluginListReq) {
    const list = await this.findOnlinePluginRecords(req);
    return await this.attachOnlineInstallState(list.map(item => this.toOnlinePluginBean(item)));
  }

  async syncOnlinePluginList() {
    await this.plusService.register();

    // 只同步市场列表元数据，插件 YAML 内容仍然在安装时按版本下载。
    const pluginMap = new Map<string, OnlinePluginBean>();
    const createdAtLt = Date.now();
    let pageStart = 0;
    while (true) {
      const res = await this.plusService.request({
        url: "/activation/plugin/page",
        method: "post",
        data: {
          createdAtLt,
          page: {
            start: pageStart,
            limit: ONLINE_PLUGIN_SYNC_PAGE_SIZE,
            orderBy: [
              {
                name: "id",
                asc: false,
              },
            ],
          },
        },
      });
      const list = res?.list || [];
      for (const item of list) {
        const record = { ...item };
        const fullName = this.getOnlinePluginFullName(record);
        if (!fullName) {
          continue;
        }
        record.fullName = fullName;
        pluginMap.set(fullName, record);
      }
      const total = Number(res?.page?.total || 0);
      if (total > 0) {
        pageStart += ONLINE_PLUGIN_SYNC_PAGE_SIZE;
        if (pageStart >= total) {
          break;
        }
        continue;
      }
      if (list.length < ONLINE_PLUGIN_SYNC_PAGE_SIZE) {
        break;
      }
      pageStart += ONLINE_PLUGIN_SYNC_PAGE_SIZE;
    }
    const existingList = await this.find({
      where: {
        type: "store",
      },
    });
    const existingMap = new Map<string, PluginEntity>();
    for (const item of existingList) {
      const fullName = item.fullName || this.getOnlinePluginFullName(item as any);
      if (fullName) {
        existingMap.set(fullName, item);
      }
    }
    const syncTime = Date.now();
    const records = Array.from(pluginMap.values()).map(item => {
      return this.normalizeOnlinePluginRecord(item, syncTime, existingMap.get(item.fullName));
    });
    await this.addOrUpdate(records);
    await this.saveOnlinePluginSyncTime(syncTime);
    return await this.onlinePluginList({});
  }

  async getOnlinePluginSetting() {
    return await this.sysSettingsService.getSetting<SysPluginSetting>(SysPluginSetting);
  }

  async installOnlinePlugin(req: OnlinePluginInstallReq) {
    const fullName = (req.fullName || "").trim();
    parseOnlinePluginFullName(fullName);

    await this.plusService.register();
    const res = await this.plusService.request({
      url: "/activation/plugin/download",
      method: "post",
      data: {
        fullName,
        version: req.version || "",
      },
    });
    if (!res?.content) {
      throw new Error("插件内容为空");
    }

    const content = fillOnlinePluginYamlVersion(res.content, res.version?.version || req.version);
    const importRes = await this.importPlugin({
      content,
      override: true,
      type: "store",
    });
    await this.refreshOnlinePluginDownloadCount(res.fullName || fullName, res.plugin?.downloadCount);
    return {
      ...importRes,
      fullName: res.fullName || fullName,
      plugin: res.plugin,
      version: res.version,
    };
  }

  async onlinePluginDetail(req: OnlinePluginDetailReq) {
    await this.plusService.register();
    const res = await this.plusService.request({
      url: "/activation/plugin/detail",
      method: "post",
      data: {
        pluginId: req.pluginId || 0,
        fullName: req.fullName || "",
        commentPageNo: req.commentPageNo || 1,
        commentPageSize: req.commentPageSize || 5,
      },
    });
    if (res?.plugin) {
      const [plugin] = await this.attachOnlineInstallState([res.plugin]);
      res.plugin = plugin;
    }
    return res;
  }

  async submitOnlinePluginVersion(req: OnlinePluginVersionSubmitReq) {
    const installInfo = await this.sysSettingsService.getSetting<SysInstallInfo>(SysInstallInfo);
    if (!installInfo.bindUserId) {
      throw new Error("请先绑定账号后再发布版本");
    }
    await this.plusService.register();
    return await this.plusService.request({
      url: "/activation/plugin/version/submit",
      method: "post",
      data: {
        fullName: req.fullName,
        version: req.version,
        content: req.content,
        minAppVersion: req.minAppVersion || "",
        maxAppVersion: req.maxAppVersion || "",
      },
    });
  }

  async publishLocalPlugin(req: OnlinePluginPublishReq) {
    if (!req.id) {
      throw new Error("插件ID不能为空");
    }
    const installInfo = await this.sysSettingsService.getSetting<SysInstallInfo>(SysInstallInfo);
    if (!installInfo.bindUserId) {
      throw new Error("请先绑定账号后再发布插件");
    }
    const plugin = await this.info(req.id);
    if (!plugin) {
      throw new Error("插件不存在");
    }
    if (normalizePluginSourceType(plugin.type) !== "store") {
      throw new Error("只有商店插件可以发布到插件市场");
    }
    if (!canEditStorePlugin(plugin.developerId, installInfo.bindUserId)) {
      throw new Error("当前绑定账号无权编辑该插件");
    }
    const content = await this.exportPlugin(req.id);
    await this.plusService.register();
    return await this.plusService.request({
      url: "/activation/plugin/publish",
      method: "post",
      data: {
        content,
        version: req.version || plugin.version || "",
        minAppVersion: req.minAppVersion || "",
        maxAppVersion: req.maxAppVersion || "",
      },
    });
  }

  async ensurePluginEditable(id: number) {
    const plugin = await this.info(id);
    if (!plugin) {
      throw new Error("插件不存在");
    }
    if (plugin.type === "custom") {
      return plugin;
    }
    if (plugin.type !== "store") {
      throw new Error("该插件不允许编辑");
    }
    const installInfo = await this.sysSettingsService.getSetting<SysInstallInfo>(SysInstallInfo);
    if (!canEditStorePlugin(plugin.developerId, installInfo.bindUserId)) {
      throw new Error("当前绑定账号无权编辑该插件");
    }
    return plugin;
  }

  private async getBindUserId(action: string) {
    const installInfo = await this.sysSettingsService.getSetting<SysInstallInfo>(SysInstallInfo);
    if (!installInfo.bindUserId) {
      throw new Error(`请先绑定账号后再${action}`);
    }
    return installInfo.bindUserId;
  }

  async getOnlinePluginAuthor(): Promise<OnlinePluginAuthorGetReply> {
    await this.getBindUserId("发布插件");
    await this.plusService.register();
    return await this.plusService.request({
      url: "/activation/plugin/author/get",
      method: "post",
      data: {},
    });
  }

  async addOnlinePluginAuthor(req: OnlinePluginAuthorAddReq): Promise<OnlinePluginAuthorBean> {
    await this.getBindUserId("注册插件作者");
    await this.plusService.register();
    return await this.plusService.request({
      url: "/activation/plugin/author/add",
      method: "post",
      data: {
        name: req.name,
        displayName: req.displayName || "",
        avatar: req.avatar || "",
        desc: req.desc || "",
      },
    });
  }

  async getOnlinePluginPublishInfo(req: OnlinePluginPublishInfoReq): Promise<OnlinePluginPublishInfo> {
    if (!req.id) {
      throw new Error("插件ID不能为空");
    }
    const plugin = await this.info(req.id);
    if (!plugin) {
      throw new Error("插件不存在");
    }
    if (normalizePluginSourceType(plugin.type) !== "store") {
      throw new Error("只有商店插件可以发布到插件市场");
    }
    const bindUserId = await this.getBindUserId("发布插件");
    if (!canEditStorePlugin(plugin.developerId, bindUserId)) {
      throw new Error("当前绑定账号无权编辑该插件");
    }

    const authorReply = await this.getOnlinePluginAuthor();
    const author = authorReply?.author;
    const reply: OnlinePluginPublishInfo = {
      localPlugin: {
        id: plugin.id,
        name: plugin.name,
        title: plugin.title,
        pluginType: plugin.pluginType,
        group: plugin.group,
        version: plugin.version,
        desc: plugin.desc,
        icon: plugin.icon,
      },
      authorRegistered: !!authorReply?.registered && !!author?.id,
      author,
      versions: [],
    };
    if (!reply.authorRegistered || !author?.name) {
      return reply;
    }

    const fullName = `${author.name}/${plugin.name}`;
    try {
      const detail = await this.onlinePluginDetail({
        fullName,
      });
      reply.marketPlugin = detail?.plugin;
      reply.versions = detail?.versions || [];
    } catch (e) {
      logger.warn("get online plugin detail failed", e);
    }
    return reply;
  }

  private async saveOnlinePluginSyncTime(syncTime: number) {
    const setting = await this.sysSettingsService.getSetting<SysPluginSetting>(SysPluginSetting);
    setting.lastSyncTime = syncTime;
    await this.sysSettingsService.saveSetting(setting);
  }

  private async refreshOnlinePluginDownloadCount(fullName: string, downloadCount?: number) {
    if (!fullName || downloadCount == null) {
      return;
    }
    await this.updateWhere(
      {
        type: "store",
        fullName,
      },
      {
        downloadCount,
      }
    );
  }

  async unRegisterById(id: any) {
    const item = await this.info(id);
    if (!item) {
      return;
    }
    if (item.type === "builtIn") {
      return;
    }
    const metadata = item.metadata ? yaml.load(item.metadata) : {};
    const extra = item.extra ? yaml.load(item.extra) : {};
    const plugin = {
      ...item,
      ...metadata,
      ...extra,
    };
    const name = getPluginRegistryName(plugin);
    if (item.pluginType === "access") {
      accessRegistry.unRegister(name);
    } else if (item.pluginType === "deploy") {
      pluginRegistry.unRegister(name);
    } else if (item.pluginType === "dnsProvider") {
      dnsProviderRegistry.unRegister(name);
    } else if (item.pluginType === "notification") {
      notificationRegistry.unRegister(name);
    } else if (item.pluginType === "addon") {
      addonRegistry.unRegister(name);
    } else {
      logger.warn(`不支持的插件类型：${item.pluginType}`);
    }
    await this.refreshPluginDeps();
  }

  async refreshPluginDeps() {
    const service = getRuntimeDepsService();
    service.refreshPluginDeps();
  }

  async update(param: any) {
    param.type = normalizePluginSourceType(param.type);
    let old: PluginEntity | null;
    if (param.type === "store" && param.fullName) {
      old = await this.findOne({
        where: {
          type: "store",
          fullName: param.fullName,
        },
      });
    } else {
      old = await this.findOne({
        where: {
          name: param.name,
          author: param.author,
        },
      });
    }

    if (old && old.id !== param.id) {
      throw new Error(`插件${param.author}/${param.name}已存在`);
    }

    await this.unRegisterById(param.id);
    const res = await super.update(param);

    await this.registerById(param.id);
    return res;
  }

  async compile(code: string) {
    const ts = await import("typescript");
    return ts.transpileModule(code, {
      compilerOptions: { module: ts.ModuleKind.ESNext },
    }).outputText;
  }

  async importer(modulePath: string) {
    if (!modulePath) {
      throw new Error("modules path 不能为空");
    }
    if (!isBareModuleSpecifier(modulePath)) {
      return await importLocalModule(modulePath);
    }
    return await importRuntimeDirect(modulePath, logger);
  }

  private async getPluginClassFromFile(item: any) {
    const scriptFilePath = item.scriptFilePath;
    const res = await import(`../../..${scriptFilePath}`);
    const classNames = Object.keys(res);
    return res[classNames[classNames.length - 1]];
  }

  async getPluginClassFromDb(pluginName: string) {
    //获取插件类实例对象
    let author = undefined;
    let name = "";
    if (pluginName.includes("/")) {
      const arr = pluginName.split("/");
      author = arr[0];
      name = arr[1];
    } else {
      name = pluginName;
    }
    const info = await this.find({
      where: {
        name: name,
        author: author,
      },
    });
    if (info && info.length > 0) {
      const plugin = info[0];
      try {
        const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
        // const script = await this.compile(plugin.content);
        const script = plugin.content;
        const getPluginClass = new AsyncFunction("_ctx", script);
        const importer = this.importer.bind(this);
        return await getPluginClass({ logger: logger, import: importer });
      } catch (e) {
        logger.error("编译插件失败:", e);
        throw e;
      }
    }
    throw new Error(`插件${pluginName}不存在`);
  }

  /**
   * 从数据库加载插件
   */
  async registerFromDb() {
    const res = await this.list({
      buildQuery: bq => {
        bq.andWhere("type != :type", {
          type: "builtIn",
        });
        this.addInstalledPluginOnlyQuery(bq);
      },
    });

    for (const item of res) {
      await this.registerPlugin(item);
    }
  }

  async registerFromLocal(localDir: string) {
    //scan path
    const files = fs.readdirSync(localDir);
    let list = [];
    for (const file of files) {
      if (!file.endsWith(".yaml")) {
        continue;
      }
      const item = yaml.load(fs.readFileSync(path.join(localDir, file), "utf8"));

      list.push(item);
    }
    //排序
    list = list.sort((a, b) => {
      return (a.order ?? 10) - (b.order ?? 10);
    });

    for (const item of list) {
      await this.registerPlugin(item);
    }
  }

  async registerPlugin(plugin: PluginEntity) {
    const metadata = plugin.metadata ? yaml.load(plugin.metadata) : {};
    const extra = plugin.extra ? yaml.load(plugin.extra) : {};
    const item = {
      ...plugin,
      ...metadata,
      ...extra,
    };
    delete item.metadata;
    delete item.content;
    delete item.extra;
    const fullName = getPluginFullName(item);
    item.name = fullName;
    const name = getPluginRegistryName(item);
    let registry = null;
    if (item.pluginType === "access") {
      registry = accessRegistry;
    } else if (item.pluginType === "deploy") {
      registry = pluginRegistry;
    } else if (item.pluginType === "dnsProvider") {
      registry = dnsProviderRegistry;
    } else if (item.pluginType === "notification") {
      registry = notificationRegistry;
    } else if (item.pluginType === "addon") {
      registry = addonRegistry;
    } else {
      logger.warn(`插件${name}类型错误:${item.pluginType}`);
      return;
    }

    registry.register(name, {
      define: item,
      target: async () => {
        if (item.type === "builtIn") {
          return await this.getPluginClassFromFile(item);
        } else {
          return await this.getPluginClassFromDb(fullName);
        }
      },
    });
  }

  async getRuntimeDependencyPluginDefines() {
    const builtInList = await this.getEnabledBuiltInList();
    const customList = await this.list({
      buildQuery: bq => {
        bq.andWhere("type != :type", {
          type: "builtIn",
        });
        this.addInstalledPluginOnlyQuery(bq);
      },
    });
    const list = [...builtInList];
    for (const plugin of customList) {
      const metadata = plugin.metadata ? yaml.load(plugin.metadata) : {};
      const extra = plugin.extra ? yaml.load(plugin.extra) : {};
      list.push({ ...plugin, ...metadata, ...extra });
    }
    return list.filter(item => item.dependPackages);
  }

  async exportPlugin(id: number) {
    const info = await this.info(id);
    if (!info) {
      throw new Error("插件不存在");
    }
    const metadata = yaml.load(info.metadata || "");
    const extra = yaml.load(info.extra || "");
    const content = info.content;
    delete info.metadata;
    delete info.extra;
    delete info.content;
    delete info.id;
    delete info.createTime;
    delete info.updateTime;
    const plugin = {
      ...info,
      ...metadata,
      ...extra,
      content,
    };

    return yaml.dump(plugin) as string;
  }

  async importPlugin(req: PluginImportReq) {
    const loaded = yaml.load(req.content);
    if (!loaded) {
      throw new Error("插件内容不能为空");
    }
    delete loaded.id;

    const fullName = loaded.fullName || (loaded.author && loaded.name ? `${loaded.author}/${loaded.name}` : "");
    const entityType = normalizePluginSourceType(req.type || loaded.type);

    let old: PluginEntity | null;
    if (entityType === "store") {
      old = await this.findOne({
        where: [
          {
            type: "store",
            fullName,
          },
          {
            type: "store",
            author: loaded.author,
            name: loaded.name,
          },
        ],
      });
      if (!old) {
        // 兼容旧版本仍标记为 custom 的在线插件，覆盖安装时应复用原记录。
        old = await this.findOne({
          where: {
            author: loaded.author,
            name: loaded.name,
          },
        });
      }
    } else {
      old = await this.findOne({
        where: {
          name: loaded.name,
          author: loaded.author,
        },
      });
    }

    const metadata = {
      input: loaded.input,
      output: loaded.output,
    };
    const extra = {
      dependPlugins: loaded.dependPlugins,
      dependPackages: loaded.dependPackages,
      default: loaded.default,
      showRunStrategy: loaded.showRunStrategy,
    };

    const pluginEntity = {
      ...loaded,
      appId: entityType === "store" ? (old?.appId ?? loaded.appId) : loaded.appId,
      developerId: entityType === "store" ? (old?.developerId ?? loaded.developerId) : loaded.developerId,
      fullName: entityType === "store" ? fullName || old?.fullName : old?.fullName,
      type: entityType,
      metadata: yaml.dump(metadata),
      extra: yaml.dump(extra),
      content: loaded.content,
      installed: true,
      latest: old?.latest ?? loaded.latest,
      status: old?.status ?? loaded.status,
      downloadCount: old?.downloadCount ?? loaded.downloadCount,
      syncTime: old?.syncTime ?? loaded.syncTime,
      disabled: old?.disabled ?? false,
    };
    if (!pluginEntity.pluginType) {
      throw new Error(`插件类型不能为空`);
    }

    if (!old) {
      //add
      const { id } = await this.add(pluginEntity);
      pluginEntity.id = id;
    } else {
      if (!req.override) {
        throw new Error(`插件${loaded.author}/${loaded.name}已存在`);
      }
      pluginEntity.id = old.id;
    }
    //update
    await this.update(pluginEntity);
    return {
      id: pluginEntity.id,
    };
  }
  async deleteByIds(ids: any[]) {
    ids = this.filterIds(ids);
    for (const id of ids) {
      const item = await this.info(id);
      if (!item) {
        continue;
      }
      await this.unRegisterById(id);
      if (item.type === "store" && item.developerId) {
        await this.updateWhere(
          { id },
          {
            installed: false,
            disabled: false,
          }
        );
        continue;
      }
      await this.delete(id);
    }
  }
}
