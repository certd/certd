import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { addonRegistry, BaseService, PageReq } from "@certd/lib-server";
import { PluginEntity } from "../entity/plugin.js";
import { InjectEntityModel } from "@midwayjs/typeorm";
import { IsNull, Not, Repository } from "typeorm";
import { isComm } from "@certd/plus-core";
import { BuiltInPluginService } from "../../pipeline/service/builtin-plugin-service.js";
import { merge } from "lodash-es";
import { accessRegistry, notificationRegistry, pluginRegistry } from "@certd/pipeline";
import { dnsProviderRegistry } from "@certd/plugin-cert";
import { logger } from "@certd/basic";
import yaml from "js-yaml";
import { getDefaultAccessPlugin, getDefaultDeployPlugin, getDefaultDnsPlugin } from "./default-plugin.js";
import fs from "fs";
import path from "path";

export type PluginImportReq = {
  content: string,
  override?: boolean;
};

 async function importer(modulePath: string) {
  if (!modulePath) {
    throw new Error("modules path 不能为空")
  }
  if (!modulePath.startsWith("/@/")) {
    return await import(modulePath)
  }
  modulePath = modulePath.replace("/@/", "")
  //替换@为相对地址
  modulePath = `../../../${modulePath}`
  return await import(modulePath)
}

@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class PluginService extends BaseService<PluginEntity> {
  @InjectEntityModel(PluginEntity)
  repository: Repository<PluginEntity>;

  @Inject()
  builtInPluginService: BuiltInPluginService;

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
      limit: limit
    };
  }

  async getEnabledBuildInGroup(opts?: { isSimple?: boolean, withSetting?: boolean }) {
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
        sysSetting: true
      },
      where: {
        sysSetting: Not(IsNull())
      }
    })
    //合并插件配置
    const pluginSettingMap: any = {}
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
          item.sysSetting = pluginSetting
        }
      }
    }


    //排除禁用的
    const list = await this.list({
      query: {
        disabled: true
      }
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
        disabled: true
      }
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
        type: "builtIn"
      }
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
        group: item.group
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
        author: param.author
      }
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
      ...plugin
    });

    await this.registerById(res.id);
    return res
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
      name = `${item.author}/${item.name}`
    }
    if (item.pluginType === "access") {
      accessRegistry.unRegister(name)
    } else if (item.pluginType === "deploy") {
      pluginRegistry.unRegister(name)
    } else if (item.pluginType === "dnsProvider") {
      dnsProviderRegistry.unRegister(name)
    } else if (item.pluginType === "notification") {
      notificationRegistry.unRegister(name)
    }else if (item.pluginType === "addon") {
      addonRegistry.unRegister(name)
    } else {
      logger.warn(`不支持的插件类型：${item.pluginType}`)
    }
  }

  async update(param: any) {
    const old = await this.repository.findOne({
      where: {
        name: param.name,
        author: param.author
      }
    });

    if (old && old.id !== param.id) {
      throw new Error(`插件${param.author}/${param.name}已存在`);
    }


    const res = await super.update(param);

    await this.registerById(param.id);
    return res
  }

  async compile(code: string) {
    const ts = await import("typescript");
    return ts.transpileModule(code, {
      compilerOptions: { module: ts.ModuleKind.ESNext }
    }).outputText;
  }


  private async getPluginClassFromFile(item: any) {
    const scriptFilePath = item.scriptFilePath;
    const res = await import((`../../..${scriptFilePath}`))
    const classNames = Object.keys(res)
    return res[classNames[classNames.length - 1]]
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
        author: author
      }
    });
    if (info && info.length > 0) {
      const plugin = info[0];
      try {
        const AsyncFunction = Object.getPrototypeOf(async () => {
        }).constructor;
        // const script = await this.compile(plugin.content);
        const script = plugin.content;
        const getPluginClass = new AsyncFunction("_ctx", script);
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
      buildQuery: ((bq) => {
        bq.andWhere("type != :type", {
          type: "builtIn"
        });
      })
    });

    for (const item of res) {
      await this.registerPlugin(item);
    }
  }

  async registerFromLocal(localDir: string) {
    //scan path
    const files = fs.readdirSync(localDir);
    let list = []
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
      ...extra
    };
    delete item.metadata;
    delete item.content;
    delete item.extra;
    if (item.author) {
      item.name = item.author + "/" + item.name;
    }
    let name = item.name
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
      }
    });
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
      content
    };

    return yaml.dump(plugin) as string;
  }

  async importPlugin(req: PluginImportReq) {

    const loaded = yaml.load(req.content);
    if (!loaded) {
      throw new Error("插件内容不能为空");
    }
    delete loaded.id

    const old = await this.repository.findOne({
      where: {
        name: loaded.name,
        author: loaded.author
      }
    });

    const metadata = {
      input: loaded.input,
      output: loaded.output
    };
    const extra = {
      dependPlugins: loaded.dependPlugins,
      default: loaded.default,
      showRunStrategy: loaded.showRunStrategy
    };

    const pluginEntity = {
      ...loaded,
      metadata: yaml.dump(metadata),
      extra: yaml.dump(extra),
      content: loaded.content,
      disabled: false
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
      id: pluginEntity.id
    };
  }


  async deleteByIds(ids: any[]) {
    await super.delete(ids);
    for (const id of ids) {
      await this.unRegisterById(id)
    }
  }


}
