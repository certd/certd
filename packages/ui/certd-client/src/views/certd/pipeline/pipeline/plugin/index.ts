export class PluginManager {
  // @ts-ignore
  map: {
    [key: string]: any;
  } = {};

  /**
   * 初始化plugins
   * @param plugins
   */
  init(plugins: any) {
    const list = plugins;
    const map: any = {};
    for (const plugin of list) {
      map[plugin.key] = plugin;
    }
    this.map = map;
  }


}

export const pluginManager = new PluginManager();
