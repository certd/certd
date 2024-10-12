import { FormItemProps } from "../d.ts/index.js";

export type PluginConfig = {
  show: false;
  sysInput: {
    [key: string]: {};
  };
};

//插件配置服务
export type IPluginConfigService = {
  getPluginConfig: (pluginName: string) => Promise<any>;
};
