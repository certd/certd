export type PluginConfig = {
  name: string;
  disabled: boolean;
  sysSetting: {
    input: Record<string, any>;
  };
};

//插件配置服务
export type IPluginConfigService = {
  getPluginConfig: (pluginName: string) => Promise<PluginConfig>;
};
