import type { Pipeline } from "@certd/pipeline";
import { FormItemProps } from "@fast-crud/fast-crud";
export type PipelineDetail = {
  pipeline: Pipeline;
};

export type RunHistory = {
  id: any;
  pipeline: Pipeline;
  logs?: {
    [id: string]: string[];
  };
};
export type PluginGroup = {
  key: string;
  title: string;
  desc?: string;
  order: number;
  plugins: any[];
};

export type PluginDefine = {
  key: string;
  title: string;
  desc?: string;
  input: {
    [key: string]: FormItemProps;
  };
  output: {
    [key: string]: any;
  };
};

export class PluginGroups {
  groups: { [key: string]: PluginGroup };
  map: { [key: string]: PluginDefine };
  constructor(groups: { [key: string]: PluginGroup }) {
    this.groups = groups;
    this.initGroup(groups);
    this.initMap();
  }

  private initGroup(groups: { [p: string]: PluginGroup }) {
    const all: PluginGroup = {
      key: "all",
      title: "全部",
      order: 0,
      plugins: []
    };
    for (const key in groups) {
      all.plugins.push(...groups[key].plugins);
    }
    this.groups = {
      all,
      ...groups
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

  getPreStepOutputOptions({ pipeline, currentStageIndex, currentStepIndex, currentTask }: any) {
    const steps = this.collectionPreStepOutputs({
      pipeline,
      currentStageIndex,
      currentStepIndex,
      currentTask
    });
    const options: any[] = [];
    for (const step of steps) {
      const stepDefine = this.get(step.type);
      for (const key in stepDefine?.output) {
        options.push({
          value: `step.${step.id}.${key}`,
          label: `${stepDefine.output[key].title}【from：${step.title}】`,
          type: step.type
        });
      }
    }
    return options;
  }

  collectionPreStepOutputs({ pipeline, currentStageIndex, currentStepIndex, currentTask }: any) {
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
    //放当前任务下的step
    for (let i = 0; i < currentStepIndex; i++) {
      const step = currentTask.steps[i];
      steps.push(step);
    }
    return steps;
  }
}

export type PipelineOptions = {
  doTrigger(options: { pipelineId: number }): Promise<void>;
  doSave(pipelineConfig: Pipeline): Promise<void>;
  getPipelineDetail(query: { pipelineId: number }): Promise<PipelineDetail>;
  getHistoryList(query: { pipelineId: number }): Promise<RunHistory[]>;
  getHistoryDetail(query: { historyId: number }): Promise<RunHistory>;
  getPluginGroups(): Promise<PluginGroups>;
};
