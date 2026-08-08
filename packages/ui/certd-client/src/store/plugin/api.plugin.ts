import { request } from "/src/api/service";
import * as _ from "lodash-es";
import { PluginConfigBean, PluginSysSetting } from "/@/views/sys/plugin/api";
const apiPrefix = "/pi/plugin";

const defaultInputDefine = {
  component: {
    name: "a-input",
    vModel: "modelValue",
  },
};

function initPlugins(plugins: any) {
  const checkedComponents = ["a-checkbox", "a-radio", "a-switch"];
  for (const plugin of plugins) {
    for (const key in plugin.input) {
      const field = _.merge({}, defaultInputDefine, plugin.input[key]);
      const componentName = field.component.name;
      if (componentName.startsWith("a-")) {
        if (checkedComponents.includes(componentName)) {
          field.component.vModel = "checked";
        } else {
          field.component.vModel = "value";
        }
      }
      //嵌套对象
      field.key = ["input", key];
      if (field.required) {
        // delete field.required;
        if (field.rules == null) {
          field.rules = [];
        }
        field.rules.push({ required: true, message: "此项必填" });
      }
      plugin.input[key] = field;
    }
  }
}

export async function GetList(query: any) {
  const plugins = await request({
    url: apiPrefix + "/list",
    method: "post",
    params: query,
  });
  initPlugins(plugins);
  return plugins;
}

export async function GetGroups(query: any) {
  const groups = await request({
    url: apiPrefix + "/groups",
    method: "post",
    params: query,
  });
  const plugins: any = [];
  for (const groupKey in groups) {
    plugins.push(...groups[groupKey].plugins);
  }
  initPlugins(plugins);
  return groups;
}

export async function GetPluginDefine(type: string) {
  const define = await request({
    url: apiPrefix + "/getDefineByType",
    method: "post",
    data: {
      type,
    },
  });
  initPlugins([define]);
  return define;
}

export async function GetPluginConfig(req: { id?: number; name: string; type: string }): Promise<PluginConfigBean> {
  return await request({
    url: apiPrefix + "/config",
    method: "post",
    data: req,
  });
}
