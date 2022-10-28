import { ConcurrencyStrategy, HistoryResult, HistoryResultGroup, Pipeline, ResultType, Runnable, RunStrategy, Stage, Step, Task } from "../d.ts";
import _ from "lodash";
import { RunHistory } from "./run-history";
import { pluginRegistry, TaskPlugin } from "../plugin";
import { IAccessService } from "../access/access-service";
import { ContextFactory, IContext } from "./context";
import { IStorage } from "./storage";
import { logger } from "../utils/util.log";
import { Logger } from "log4js";

export class Executor {
  userId: any;
  pipeline: Pipeline;
  runtime!: RunHistory;
  accessService: IAccessService;
  contextFactory: ContextFactory;
  logger: Logger;
  pipelineContext: IContext;
  onChanged: (history: RunHistory) => void;
  constructor(options: { userId: any; pipeline: Pipeline; storage: IStorage; onChanged: (history: RunHistory) => void; accessService: IAccessService }) {
    this.pipeline = options.pipeline;
    this.onChanged = options.onChanged;
    this.accessService = options.accessService;
    this.userId = options.userId;
    this.contextFactory = new ContextFactory(options.storage);
    this.logger = logger;
    this.pipelineContext = this.contextFactory.getContext("pipeline", this.pipeline.id);
  }

  async run(runtimeId: any = 0) {
    try {
      this.runtime = new RunHistory(runtimeId);
      this.logger.info(`pipeline.${this.pipeline.id}  start`);
      await this.runWithHistory(this.pipeline, "pipeline", async () => {
        return await this.runStages();
      });
    } finally {
      this.logger.info(`pipeline.${this.pipeline.id}  end`);
    }
  }

  async runWithHistory(runnable: Runnable, runnableType: string, run: (result: HistoryResult) => Promise<any>) {
    const result = this.runtime.start(runnable, runnableType);
    this.onChanged(this.runtime);
    const contextKey = `status.${runnable.id}`;
    if (runnable.strategy?.runStrategy === RunStrategy.SkipWhenSucceed) {
      const lastResult = await this.pipelineContext.get(contextKey);
      if (lastResult != null && lastResult === ResultType.success) {
        this.runtime.log(runnable, result, "跳过");
        return ResultType.skip;
      }
    }
    try {
      await run(result);
      this.runtime.success(runnable);
      this.onChanged(this.runtime);
      await this.pipelineContext.set(contextKey, ResultType.success);
      return ResultType.success;
    } catch (e: any) {
      this.logger.error(e);
      this.runtime.error(runnable, e);
      this.onChanged(this.runtime);
      await this.pipelineContext.set(contextKey, ResultType.error);
      throw e;
    } finally {
      this.runtime.finally(runnable);
    }
  }

  private async runStages() {
    const resList: ResultType[] = [];
    for (const stage of this.pipeline.stages) {
      const res: ResultType = await this.runWithHistory(stage, "stage", async (result) => {
        return await this.runStage(stage, result);
      });
      resList.push(res);
    }
    return this.compositionResultType(resList);
  }

  async runStage(stage: Stage, result: HistoryResult) {
    const runnerList = [];
    for (const task of stage.tasks) {
      const runner = this.runWithHistory(task, "task", async (result) => {
        return await this.runTask(task, result);
      });
      runnerList.push(runner);
    }

    let resList: ResultType[] = [];
    if (stage.concurrency === ConcurrencyStrategy.Parallel) {
      resList = await Promise.all(runnerList);
    } else {
      for (let i = 0; i < runnerList.length; i++) {
        const runner = runnerList[i];
        resList[i] = await runner;
      }
    }
    return this.compositionResultType(resList);
  }

  compositionResultType(resList: ResultType[]) {
    let hasSuccess = false;
    for (const type of resList) {
      if (type === ResultType.error) {
        return ResultType.error;
      }
      if (type === ResultType.success) {
        hasSuccess = true;
      }
    }
    if (hasSuccess) {
      return ResultType.success;
    }
    return ResultType.error;
  }

  private async runTask(task: Task, result: HistoryResult) {
    const resList: ResultType[] = [];
    for (const step of task.steps) {
      const res: ResultType = await this.runWithHistory(step, "step", async (result) => {
        await this.runStep(step, result);
      });
      resList.push(res);
    }
    return this.compositionResultType(resList);
  }

  private async runStep(step: Step, result: HistoryResult) {
    //执行任务
    const taskPlugin: TaskPlugin = await this.getPlugin(step.type, result.logger);
    // @ts-ignore
    delete taskPlugin.define;
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

  private async getPlugin(type: string, logger: Logger): Promise<TaskPlugin> {
    const pluginClass = pluginRegistry.get(type);
    // @ts-ignore
    const plugin = new pluginClass();
    await plugin.doInit({
      accessService: this.accessService,
      pipelineContext: this.pipelineContext,
      userContext: this.contextFactory.getContext("user", this.userId),
      logger,
    });
    return plugin;
  }
}
