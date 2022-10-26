import { ConcurrencyStrategy, Pipeline, Runnable, Stage, Step, Task } from "../d.ts/pipeline";
import _ from "lodash";
import { RunHistory } from "./run-history";
import { pluginRegistry, TaskPlugin } from "../plugin";
import { IAccessService } from "../access/access-service";
import { ContextFactory } from "./context";
import { IStorage } from "./storage";
import { logger } from "../utils/util.log";

export class Executor {
  userId: any;
  pipeline: Pipeline;
  runtime: RunHistory = new RunHistory();
  lastSuccessHistory: RunHistory;
  accessService: IAccessService;
  contextFactory: ContextFactory;
  onChanged: (history: RunHistory) => void;
  constructor(options: {
    userId: any;
    pipeline: Pipeline;
    storage: IStorage;
    onChanged: (history: RunHistory) => void;
    lastSuccessHistory?: RunHistory;
    accessService: IAccessService;
  }) {
    this.pipeline = options.pipeline;
    this.lastSuccessHistory = options.lastSuccessHistory ?? new RunHistory();
    this.onChanged = options.onChanged;
    this.accessService = options.accessService;
    this.userId = options.userId;

    this.contextFactory = new ContextFactory(options.storage);
  }

  async run() {
    await this.runWithHistory(this.pipeline, async () => {
      return await this.runStages();
    });
  }

  async runWithHistory(runnable: Runnable, run: () => Promise<any>) {
    this.runtime.start(runnable);
    this.onChanged(this.runtime);
    try {
      await run();
      this.runtime.success(runnable);
      this.onChanged(this.runtime);
    } catch (e: any) {
      logger.error(e);
      this.runtime.error(runnable, e);
      this.onChanged(this.runtime);
    }
  }

  private async runStages() {
    for (const stage of this.pipeline.stages) {
      await this.runWithHistory(stage, async () => {
        return await this.runStage(stage);
      });
    }
  }

  async runStage(stage: Stage) {
    const runnerList = [];
    for (const task of stage.tasks) {
      const runner = this.runWithHistory(task, async () => {
        return await this.runTask(task);
      });
      runnerList.push(runner);
    }
    if (stage.concurrency === ConcurrencyStrategy.Parallel) {
      await Promise.all(runnerList);
    } else {
      for (const runner of runnerList) {
        await runner;
      }
    }
  }

  private async runTask(task: Task) {
    for (const step of task.steps) {
      await this.runWithHistory(step, async () => {
        return await this.runStep(step);
      });
    }
  }

  private async runStep(step: Step) {
    //执行任务
    const taskPlugin: TaskPlugin = await this.getPlugin(step.type);

    const define = taskPlugin.getDefine();
    //从outputContext读取输入参数
    _.forEach(define.input, (item, key) => {
      if (item.component?.name === "output-selector") {
        const contextKey = step.input[key];
        if (contextKey != null) {
          step.input[key] = this.runtime.context[contextKey];
        }
      }
    });

    const res = await taskPlugin.execute(step.input);

    //输出到output context
    _.forEach(define.output, (item, key) => {
      const contextKey = `step.${step.id}.${key}`;
      this.runtime.context[contextKey] = res[key];
    });
  }

  private async getPlugin(type: string): Promise<TaskPlugin> {
    const pluginClass = pluginRegistry.get(type);
    // @ts-ignore
    const plugin = new pluginClass();
    await plugin.doInit({
      accessService: this.accessService,
      pipelineContext: this.contextFactory.getContext("pipeline", this.pipeline.id),
      userContext: this.contextFactory.getContext("user", this.userId),
    });
    return plugin;
  }
}
