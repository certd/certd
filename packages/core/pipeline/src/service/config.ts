export type PluginConfig = {
  name: string;
  disabled: boolean;
  sysSetting: {
    [key: string]: any;
  };
};

//插件配置服务
export type IPluginConfigService = {
  getPluginConfig: (pluginName: string) => Promise<any>;
};
