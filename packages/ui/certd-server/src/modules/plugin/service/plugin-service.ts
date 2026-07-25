import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { addonRegistry, BaseService, PageReq, PlusService } from "@certd/lib-server";
import { PluginEntity } from "../entity/plugin.js";
import { PluginMarketItemEntity } from "../entity/plugin-market-item.js";
import { InjectEntityModel } from "@midwayjs/typeorm";
import { Brackets, IsNull, Not, Repository } from "typeorm";
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

export type OnlinePluginInstallReq = {
  fullName: string;
  version?: string;
};

export type OnlinePluginBean = {
  id?: number;
  appId?: number;
  author?: string;
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
  installed?: boolean;
  installedVersion?: string;
  upgradeAvailable?: boolean;
  localPluginId?: number;
  localDisabled?: boolean;
  syncTime?: number;
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

  @InjectEntityModel(PluginMarketItemEntity)
  pluginMarketItemRepository: Repository<PluginMarketItemEntity>;

  @Inject()
  builtInPluginService: BuiltInPluginService;

  @Inject("plusService")
  plusService: PlusService;

  //@ts-ignore
  getRepository() {
    return this.repository;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async page(pageReq: PageReq<PluginEntity>) {
    if (pageReq.query.type && pageReq.query.type !== "builtIn") {
      return await super.page(pageReq);
    }
    //仅查询内置插件
    const offset = pageReq.page.offset;
    const limit = pageReq.page.limit;

    const builtInList = await this.getBuiltInEntityList();

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
    const settingPlugins = await this.repository.find({
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
    const builtInList = this.builtInPluginService.getList();
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
      await this.repository.update({ id }, { disabled });
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
    const old = await this.repository.findOne({
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

  private normalizeOnlinePluginMarketItem(item: OnlinePluginBean, syncTime: number, old?: PluginMarketItemEntity) {
    return this.pluginMarketItemRepository.create({
      id: old?.id,
      appId: item.appId,
      fullName: this.getOnlinePluginFullName(item),
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
      syncTime,
      updateTime: new Date(),
    });
  }

  private toOnlinePluginBean(item: PluginMarketItemEntity): OnlinePluginBean {
    return {
      id: item.id,
      appId: item.appId,
      fullName: item.fullName,
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
      syncTime: item.syncTime,
    };
  }

  private async findOnlinePluginMarketItems(req: OnlinePluginListReq) {
    const query = req || {};
    const keyword = (query.keyword || "").trim().toLowerCase();
    const builder = this.pluginMarketItemRepository.createQueryBuilder("item");
    if (query.pluginType) {
      builder.andWhere("item.pluginType = :pluginType", {
        pluginType: query.pluginType,
      });
    }
    if (query.group) {
      builder.andWhere("item.group = :group", {
        group: query.group,
      });
    }
    if (keyword) {
      builder.andWhere(
        new Brackets(qb => {
          qb.where("LOWER(item.fullName) LIKE :keyword", { keyword: `%${keyword}%` })
            .orWhere("LOWER(item.author) LIKE :keyword", { keyword: `%${keyword}%` })
            .orWhere("LOWER(item.name) LIKE :keyword", { keyword: `%${keyword}%` })
            .orWhere("LOWER(item.title) LIKE :keyword", { keyword: `%${keyword}%` })
            .orWhere("LOWER(item.desc) LIKE :keyword", { keyword: `%${keyword}%` })
            .orWhere("LOWER(item.group) LIKE :keyword", { keyword: `%${keyword}%` })
            .orWhere("LOWER(item.pluginType) LIKE :keyword", { keyword: `%${keyword}%` });
        })
      );
    }
    return await builder.orderBy("item.pluginType", "ASC").addOrderBy("item.group", "ASC").addOrderBy("item.title", "ASC").addOrderBy("item.fullName", "ASC").addOrderBy("item.id", "ASC").getMany();
  }

  private async findInstalledOnlinePlugin(parsed: { author: string; name: string }, record: OnlinePluginBean) {
    const fullName = record.fullName || `${parsed.author}/${parsed.name}`;
    const where: any[] = [
      {
        author: parsed.author,
        name: parsed.name,
      },
      {
        name: fullName,
      },
    ];
    if (record.pluginType) {
      where.push({
        pluginType: record.pluginType,
        name: parsed.name,
      });
    }
    return await this.repository.findOne({
      where,
    });
  }

  private async attachOnlineInstallState(list: OnlinePluginBean[]) {
    const records: OnlinePluginBean[] = [];
    for (const item of list) {
      const record: OnlinePluginBean = { ...item };
      const fullName = this.getOnlinePluginFullName(record);
      record.fullName = fullName;

      let parsed: { author: string; name: string };
      try {
        parsed = parseOnlinePluginFullName(fullName);
      } catch (e) {
        record.installed = false;
        record.upgradeAvailable = false;
        records.push(record);
        continue;
      }

      const localPlugin = await this.findInstalledOnlinePlugin(parsed, record);
      record.installed = !!localPlugin;
      record.localPluginId = localPlugin?.id;
      record.localDisabled = localPlugin?.disabled;
      record.installedVersion = localPlugin?.version;
      record.upgradeAvailable = localPlugin ? isOnlinePluginUpgradeAvailable(localPlugin.version, record.latest) : false;
      records.push(record);
    }
    return records;
  }

  async onlinePluginList(req: OnlinePluginListReq) {
    const list = await this.findOnlinePluginMarketItems(req);
    return await this.attachOnlineInstallState(list.map(item => this.toOnlinePluginBean(item)));
  }

  async syncOnlinePluginList() {
    await this.plusService.register();

    // 只同步市场列表元数据，插件 YAML 内容仍然在安装时按版本下载。
    const pluginMap = new Map<string, OnlinePluginBean>();
    let pageStart = 0;
    while (true) {
      const res = await this.plusService.request({
        url: "/activation/plugin/list",
        method: "post",
        data: {
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
      if (list.length < ONLINE_PLUGIN_SYNC_PAGE_SIZE) {
        break;
      }
      pageStart += ONLINE_PLUGIN_SYNC_PAGE_SIZE;
    }
    const existingList = await this.pluginMarketItemRepository.find();
    const existingMap = new Map(existingList.map(item => [item.fullName, item]));
    const syncTime = Date.now();
    const records = Array.from(pluginMap.values()).map(item => {
      return this.normalizeOnlinePluginMarketItem(item, syncTime, existingMap.get(item.fullName));
    });
    await this.pluginMarketItemRepository.save(records);
    return await this.onlinePluginList({});
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

  private async refreshOnlinePluginDownloadCount(fullName: string, downloadCount?: number) {
    if (!this.pluginMarketItemRepository || !fullName || downloadCount == null) {
      return;
    }
    await this.pluginMarketItemRepository.update(
      {
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
    let name = item.name;
    if (item.author && !item.name.startsWith(`${item.author}/`)) {
      name = `${item.author}/${item.name}`;
    }
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
    const old = await this.repository.findOne({
      where: {
        name: param.name,
        author: param.author,
      },
    });

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
    if (item.author && !item.name.startsWith(`${item.author}/`)) {
      item.name = item.author + "/" + item.name;
    }
    let name = item.name;
    if (item.addonType) {
      name = item.addonType + ":" + name;
    }
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
          return await this.getPluginClassFromDb(name);
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

    const old = await this.repository.findOne({
      where: {
        name: loaded.name,
        author: loaded.author,
      },
    });

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
      type: req.type || loaded.type || "custom",
      metadata: yaml.dump(metadata),
      extra: yaml.dump(extra),
      content: loaded.content,
      disabled: false,
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
      await this.unRegisterById(id);
      await this.delete(id);
    }
  }
}
