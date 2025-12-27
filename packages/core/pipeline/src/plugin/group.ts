import { PluginDefine } from "./api";

export class PluginGroup {
  key: string;
  title: string;
  desc?: string;
  order: number;
  plugins: PluginDefine[];
  icon?: string;

  constructor(key: string, title: string, order = 0, icon = "") {
    this.key = key;
    this.title = title;
    this.order = order;
    this.icon = icon;
    this.plugins = [];
  }
}

export const pluginGroups = {
  cert: new PluginGroup("cert", "证书申请", 1, "ph:certificate"),
  host: new PluginGroup("host", "主机", 2, "clarity:host-line"),
  cdn: new PluginGroup("cdn", "CDN", 2, "svg:icon-cdn"),
  panel: new PluginGroup("panel", "面板", 2, "fluent:panel-left-header-32-filled"),
  aliyun: new PluginGroup("aliyun", "阿里云", 2, "svg:icon-aliyun"),
  huawei: new PluginGroup("huawei", "华为云", 3, "svg:icon-huawei"),
  tencent: new PluginGroup("tencent", "腾讯云", 4, "svg:icon-tencentcloud"),
  volcengine: new PluginGroup("volcengine", "火山引擎", 4, "svg:icon-volcengine"),
  jdcloud: new PluginGroup("jdcloud", "京东云", 4, "svg:icon-jdcloud"),
  ucloud: new PluginGroup("ucloud", "UCloud", 4, "svg:icon-ucloud"),
  baidu: new PluginGroup("baidu", "百度云", 4, "ant-design:baidu-outlined"),
  qiniu: new PluginGroup("qiniu", "七牛云", 5, "svg:icon-qiniuyun"),
  aws: new PluginGroup("aws", "亚马逊云", 6, "svg:icon-aws"),
  other: new PluginGroup("other", "其他", 10, "clarity:plugin-line"),
  admin: new PluginGroup("admin", "管理", 11, "ion:settings-outline"),
};
