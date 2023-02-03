export class PluginManager {
  // @ts-ignore
  map: {
    [key: string]: any;
  } = {};

  /**
   * 初始化plugins
   * @param plugins
   */
  init(plugins) {
    const list = plugins;
    const map = {};
    for (const plugin of list) {
      map[plugin.key] = plugin;
    }
    this.map = map;
  }

  get(name: string) {
    return this.map[name];
  }

  getPreStepOutputOptions({ pipeline, currentStageIndex, currentStepIndex, currentTask }) {
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

  collectionPreStepOutputs({ pipeline, currentStageIndex, currentStepIndex, currentTask }) {
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

export const pluginManager = new PluginManager();
