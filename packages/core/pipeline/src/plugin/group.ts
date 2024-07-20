import { PluginDefine } from "./api";

export class PluginGroup {
  key: string;
  title: string;
  desc?: string;
  order: number;
  plugins: PluginDefine[];
  constructor(key: string, title: string, order = 0, desc = "") {
    this.key = key;
    this.title = title;
    this.order = order;
    this.desc = desc;
    this.plugins = [];
  }
}

export const pluginGroups = {
  cert: new PluginGroup("cert", "证书申请", 1),
  aliyun: new PluginGroup("aliyun", "阿里云", 2),
  huawei: new PluginGroup("huawei", "华为云", 3),
  tencent: new PluginGroup("tencent", "腾讯云", 4),
  host: new PluginGroup("host", "主机", 5),
  other: new PluginGroup("other", "其他", 7),
};
