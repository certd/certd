import { Inject, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { PluginService } from "./plugin-service.js";

export type PluginConfig = {
  name: string;
  disabled?: boolean;
  sysSetting: {
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
    await this.savePluginConfig(config.CertApply);
  }

  async savePluginConfig(config: PluginConfig) {
    const name = config.name;
    const sysSetting = config?.sysSetting;
    if (!sysSetting) {
      throw new Error(`${name}.sysSetting is required`);
    }
    const pluginEntity = await this.pluginService.getRepository().findOne({
      where: { name },
    });
    if (!pluginEntity) {
      await this.pluginService.add({
        name,
        sysSetting: JSON.stringify(sysSetting),
        type: "builtIn",
        disabled: false,
        author: "certd",
      });
    } else {
      const setting = JSON.parse(pluginEntity.sysSetting || "{}");
      if (sysSetting.metadata) {
        setting.metadata = sysSetting.metadata;
      }
      if (sysSetting.input) {
        setting.input = sysSetting.input;
      }
      await this.pluginService.getRepository().update({ name }, { sysSetting: JSON.stringify(setting) });
    }
  }

  async get(req: PluginFindReq) {
    if (!req.name && !req.id) {
      throw new Error("plugin s name or id is required");
    }
    return await this.pluginService.getRepository().findOne({
      where: {
        id: req.id,
        name: req.name,
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
      name: plugin.name,
      disabled: plugin.disabled,
      sysSetting,
    };
  }
}
