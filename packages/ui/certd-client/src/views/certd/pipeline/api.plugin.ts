import { request } from "/src/api/service";
import _ from "lodash-es";
const apiPrefix = "/pi/plugin";

const defaultInputDefine = {
  component: {
    name: "a-input",
    vModel: "modelValue"
  }
};

function initPlugins(plugins: any) {
  for (const plugin of plugins) {
    for (const key in plugin.input) {
      const field = _.merge({}, defaultInputDefine, plugin.input[key]);
      if (field.component.name === "a-input" || field.component.name === "a-select") {
        field.component.vModel = "value";
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
  console.log("plugins", plugins);
}

export async function GetList(query: any) {
  const plugins = await request({
    url: apiPrefix + "/list",
    method: "post",
    params: query
  });
  initPlugins(plugins);
  return plugins;
}

export async function GetGroups(query: any) {
  const groups = await request({
    url: apiPrefix + "/groups",
    method: "post",
    params: query
  });
  const plugins: any = [];
  for (const groupKey in groups) {
    plugins.push(...groups[groupKey].plugins);
  }
  initPlugins(plugins);
  return groups;
}
