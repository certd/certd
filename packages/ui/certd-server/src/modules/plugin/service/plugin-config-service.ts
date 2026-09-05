import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { PluginService } from "./plugin-service.js";
import { accessRegistry, notificationRegistry, pluginRegistry } from "@certd/pipeline";
import { dnsProviderRegistry } from "@certd/plugin-lib";
import { addonRegistry } from "@certd/lib-server";

export type PluginConfig = {
  name: string;
  disabled?: boolean;
  type: string;
  sysSetting?: {
    input?: Record<string, any>;
    metadata?: Record<string, any>;
  };
};

export type CommPluginConfig = {
  CertApply?: PluginConfig;
};

export type PluginFindReq = {
  id?: number;
  name?: string;
  type: string;
};

@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class PluginConfigService {
  @Inject()
  pluginService: PluginService;

  async getCommPluginConfig() {
    const configs: CommPluginConfig = {};

    configs.CertApply = await this.getPluginConfig({
      name: "CertApply",
      type: "builtIn",
    });
    return configs;
  }

  async saveCommPluginConfig(config: CommPluginConfig) {
    config.CertApply.name = "CertApply";
    config.CertApply.type = "builtIn";
    await this.savePluginConfig(config.CertApply);
  }

  async savePluginConfig(config: PluginConfig) {
    const name = config.name;
    const sysSetting = config?.sysSetting;
    if (!sysSetting) {
      throw new Error(`${name}.sysSetting is required`);
    }
    let pluginEntity: any = await this.pluginService.getRepository().findOne({
      where: { fullName: name, type: config.type },
    });
    if (!pluginEntity) {
      if (config.type !== "builtIn") {
        //只有内置插件才需要add config
        throw new Error(`${name}.type must be builtIn`);
      }
      pluginEntity = {
        name: name,
        fullName: name,
        sysSetting: JSON.stringify(sysSetting),
        type: "builtIn",
        disabled: false,
      };
      const { id } = await this.pluginService.add(pluginEntity);
      pluginEntity.id = id;
      this.loadPluginSetting(name, sysSetting);
    } else {
      const setting = JSON.parse(pluginEntity.sysSetting || "{}");
      if (sysSetting.metadata) {
        setting.metadata = sysSetting.metadata;
      }
      if (sysSetting.input) {
        //如果没有新提交，不覆盖旧的input
        setting.input = sysSetting.input;
      }
      await this.pluginService.getRepository().update({ fullName: name }, { sysSetting: JSON.stringify(setting) });
      this.loadPluginSetting(name, setting);
    }
  }

  async loadPluginSetting(name: string, sysSetting: any) {
    
    let  pluginDefine = null;
    if (!pluginDefine){
      pluginDefine = accessRegistry.getDefine(name);
    }
    if (!pluginDefine){
      pluginDefine = pluginRegistry.getDefine(name);
    }
    if (!pluginDefine){
      pluginDefine = dnsProviderRegistry.getDefine(name);
    }
    if (!pluginDefine){
      pluginDefine = addonRegistry.getDefine(name);
    }
    if (!pluginDefine){
      pluginDefine = notificationRegistry.getDefine(name);
    }
    if (!pluginDefine){
      return
    }
    pluginDefine.sysSetting = sysSetting;
  }

  async loadAllPluginSetting() {
    const pluginSettings = await this.pluginService.getRepository().find({
      select:{
        fullName: true,
        type: true,
        sysSetting: true,
      }
    });
    for (const plugin of pluginSettings) {
      this.loadPluginSetting(plugin.fullName, JSON.parse(plugin.sysSetting || "{}"));
    }
  }

  async get(req: PluginFindReq) {
    if (!req.name && !req.id) {
      throw new Error("plugin name or id is required");
    }
    return await this.pluginService.getRepository().findOne({
      where: {
        id: req.id,
        fullName: req.name,
        type: req.type,
      },
    });
  }

  async getPluginConfig(req: PluginFindReq) {
    const plugin = await this.get(req);
    let sysSetting: any = {};
    if (!plugin) {
      return {
        name: req.name,
        disabled: false,
        type: req.type,
        sysSetting,
      };
    }
    if (plugin && plugin.sysSetting) {
      sysSetting = JSON.parse(plugin.sysSetting);
    }
    return {
      name: plugin.fullName,
      disabled: plugin.disabled,
      type: plugin.type,
      sysSetting,
    };
  }
}
