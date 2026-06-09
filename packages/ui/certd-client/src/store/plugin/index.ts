import { defineStore } from "pinia";
import * as api from "./api.plugin";
import { DynamicType, FormItemProps, useMerge } from "@fast-crud/fast-crud";
import { i18n } from "/src/locales/i18n";
import { cloneDeep } from "lodash-es";
interface PluginState {
  group?: PluginGroups;
  originGroup?: PluginGroups;
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
};

export class PluginGroups {
  groups!: { [key: string]: PluginGroup };
  map!: { [key: string]: PluginDefine };
  t: any;
  mergeSetting?: boolean;
  constructor(groups: { [key: string]: PluginGroup }, opts?: { mergeSetting?: boolean }) {
    this.groups = groups;
    this.t = i18n.global.t;
    this.mergeSetting = opts?.mergeSetting ?? false;
    this.initGroup(groups);
    this.initMap();
  }

  private initGroup(groups: { [p: string]: PluginGroup }) {
    const { merge } = useMerge();
    const all: PluginGroup = {
      key: "all",
      title: this.t("certd.all"),
      order: 0,
      plugins: [],
      icon: "material-symbols:border-all-rounded",
    };
    for (const key in groups) {
      if (this.mergeSetting) {
        for (const plugin of groups[key].plugins) {
          if (plugin.sysSetting) {
            merge(plugin.input, plugin.sysSetting.metadata?.input || {});
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
        }
      }

      all.plugins.push(...groups[key].plugins);
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
    originGroup: null,
  }),
  actions: {
    async reload() {
      const groups = await api.GetGroups({});
      this.group = new PluginGroups(groups, { mergeSetting: true });
      this.originGroup = new PluginGroups(cloneDeep(groups));
      console.log("group", this.group);
      console.log("originGroup", this.originGroup);
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
    async getPluginDefineFromOrigin(name: string): Promise<PluginDefine> {
      await this.init();
      return this.originGroup.get(name);
    },
    async getPluginConfig(query: any) {
      return await api.GetPluginConfig(query);
    },
    getPluginDefineSync(name: string) {
      return this.group.get(name);
    },
  },
});
