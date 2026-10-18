import { DynamicType, FormItemProps, useMerge } from "@fast-crud/fast-crud";
import { cloneDeep, merge } from "lodash-es";
import { defineStore } from "pinia";
import * as api from "./api.plugin";
import { initComponentDefine } from "./define";
import { i18n } from "/src/locales/i18n";
interface PluginState {
  group?: PluginGroups;
  originGroup?: PluginGroups;
}

export function resolvePluginLocale(plugin: any, locale = i18n.global.locale.value) {
  const resolved = cloneDeep(plugin || {});
  if (locale === "en-US") {
    const english = resolved.i18n?.["en-US"] || resolved.metadata?.i18n?.["en-US"];
    if (english) {
      const translatedFields = ["title", "desc", "group", "input", "output", "shortcut"];
      const translated: Record<string, any> = {};
      for (const field of translatedFields) {
        if (english[field] !== undefined) {
          translated[field] = english[field];
        }
      }
      merge(resolved, translated);
    }
  }
  return resolved;
}

export function fillPluginDefine(plugin: any) {
  const columns = plugin.input;
  for (const key in columns) {
    columns[key] = initComponentDefine(columns[key]);
  }

  if (plugin.sysSetting?.metadata) {
    merge(plugin.input, plugin.sysSetting.metadata?.input || {});
    const keys = Object.keys(plugin.input);
    for (const key of keys) {
      //修复旧版本错误引入的key导致报错的问题 【多引入进了一个type=CertApply】
      const column = plugin.input[key];
      if (typeof column != "object") {
        delete plugin.input[key];
      }
    }
    // 应用选项映射
    for (const key of Object.keys(plugin.input)) {
      const inputDef = plugin.input[key];
      if (inputDef.optionsMapping && inputDef.component?.options) {
        const mapping = inputDef.optionsMapping;
        for (const opt of inputDef.component.options) {
          if (mapping[opt.value] !== undefined) {
            opt.label = mapping[opt.value];
          }
        }
      }
    }
  }
  // if (plugin.sysSetting?.input) {
  //   // 设置系统默认值, 不能放这里设置
  //   for (const key in plugin.input) {
  //     const sysValue = plugin.sysSetting?.input[key];
  //     if (sysValue != undefined) {
  //       set(plugin, `input.${key}.value`, sysValue);
  //     }
  //   }
  // }
}
export type PluginGroup = {
  key: string;
  title: string;
  desc?: string;
  order: number;
  icon: string;
  plugins: any[];
};

export type PluginDefine = {
  name: string;
  title: string;
  desc?: string;
  shortcut: any;
  input: {
    [key: string]: DynamicType<FormItemProps>;
  };
  output: {
    [key: string]: any;
  };
  type?: string;
};

export class PluginGroups {
  groups!: { [key: string]: PluginGroup };
  map!: { [key: string]: PluginDefine };
  t: any;
  mergeSetting?: boolean;
  constructor(groups: { [key: string]: PluginGroup }) {
    this.groups = groups;
    this.t = i18n.global.t;
    this.initGroup(groups);
    this.initMap();
  }

  private initGroup(groups: { [p: string]: PluginGroup }) {
    const { merge } = useMerge();
    const all: PluginGroup = {
      key: "all",
      title: this.t("certd.common.all"),
      order: 0,
      plugins: [],
      icon: "material-symbols:border-all-rounded",
    };
    for (const key in groups) {
      const localizedPlugins = [];
      for (const plugin of groups[key].plugins) {
        const localizedPlugin = resolvePluginLocale(plugin);
        fillPluginDefine(localizedPlugin);
        localizedPlugins.push(localizedPlugin);
      }
      groups[key] = { ...groups[key], plugins: localizedPlugins };
      all.plugins.push(...localizedPlugins);
    }
    this.groups = {
      all,
      ...groups,
    };
  }

  initMap() {
    const map: { [key: string]: PluginDefine } = {};
    for (const key in this.groups) {
      const group = this.groups[key];
      for (const plugin of group.plugins) {
        map[plugin.name] = plugin;
      }
    }
    this.map = map;
  }

  getGroups() {
    return this.groups;
  }

  get(name: string) {
    return this.map[name];
  }

  getPreStepOutputOptions({ pipeline, currentStageIndex, currentTaskIndex, currentStepIndex, currentTask }: any) {
    const steps = this.collectionPreStepOutputs({
      pipeline,
      currentStageIndex,
      currentTaskIndex,
      currentStepIndex,
      currentTask,
    });
    const options: any[] = [];
    for (const step of steps) {
      const stepDefine = this.get(step.type);
      for (const key in stepDefine?.output) {
        const inputDefine = stepDefine.output[key];
        options.push({
          value: `step.${step.id}.${key}`,
          label: `${inputDefine.title}【from：${step.title}】`,
          type: step.type,
          valueType: inputDefine.type,
          key: key,
        });
      }
    }
    return options;
  }

  collectionPreStepOutputs({ pipeline, currentStageIndex, currentTaskIndex, currentStepIndex, currentTask }: any) {
    const steps: any[] = [];
    // 开始放step
    for (let i = 0; i < currentStageIndex; i++) {
      const stage = pipeline.stages[i];
      for (const task of stage.tasks) {
        for (const step of task.steps) {
          steps.push(step);
        }
      }
    }
    //当前阶段之前的task
    const currentStage = pipeline.stages[currentStageIndex];
    for (let i = 0; i < currentTaskIndex; i++) {
      const task = currentStage.tasks[i];
      for (const step of task.steps) {
        steps.push(step);
      }
    }
    //放当前任务下的step
    for (let i = 0; i < currentStepIndex; i++) {
      const step = currentTask.steps[i];
      steps.push(step);
    }
    return steps;
  }
}

export const usePluginStore = defineStore({
  id: "app.plugin",
  state: (): PluginState => ({
    group: null,
  }),
  actions: {
    async reload() {
      const groups = await api.GetGroups({});
      this.group = new PluginGroups(groups);
      console.log("group", this.group);
    },
    async init() {
      if (!this.group) {
        await this.reload();
      }
      return this.group;
    },
    async getGroups(): Promise<PluginGroups> {
      await this.init();
      return this.group as PluginGroups;
    },
    async clear() {
      this.group = null;
      this.originGroup = null;
    },
    async getList(): Promise<PluginDefine[]> {
      await this.init();
      return this.group.groups.all.plugins;
    },
    async getPluginDefine(name: string): Promise<PluginDefine> {
      await this.init();
      return this.group.get(name);
    },
    async getPluginConfig(query: any) {
      await this.init();
      return await api.GetPluginConfig(query);
    },
    getPluginDefineSync(name: string) {
      if (!this.group) {
        return null;
      }
      return this.group.get(name);
    },
  },
});
