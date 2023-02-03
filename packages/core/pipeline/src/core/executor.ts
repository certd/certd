import { ConcurrencyStrategy, Pipeline, ResultType, Runnable, RunStrategy, Stage, Step, Task } from "../d.ts";
import _ from "lodash";
import { RunHistory } from "./run-history";
import { PluginDefine, pluginRegistry } from "../plugin";
import { ContextFactory, IContext } from "./context";
import { IStorage } from "./storage";
import { logger } from "../utils/util.log";
import { Logger } from "log4js";
import { request } from "../utils/util.request";
import { IAccessService } from "../access";
import { RegistryItem } from "../registry";
import { Decorator } from "../decorator";

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
    this.pipeline = _.cloneDeep(options.pipeline);
    this.onChanged = options.onChanged;
    this.accessService = options.accessService;
    this.userId = options.userId;
    this.pipeline.userId = this.userId;
    this.contextFactory = new ContextFactory(options.storage);
    this.logger = logger;
    this.pipelineContext = this.contextFactory.getContext("pipeline", this.pipeline.id);
  }

  async run(runtimeId: any = 0, triggerType: string) {
    try {
      const trigger = { type: triggerType };
      this.runtime = new RunHistory(runtimeId, trigger, this.pipeline);
      this.logger.info(`pipeline.${this.pipeline.id}  start`);
      await this.runWithHistory(this.pipeline, "pipeline", async () => {
        await this.runStages();
      });
    } finally {
      this.logger.info(`pipeline.${this.pipeline.id}  end`);
    }
  }

  async runWithHistory(runnable: Runnable, runnableType: string, run: () => Promise<void>) {
    runnable.runnableType = runnableType;
    this.runtime.start(runnable);
    await this.onChanged(this.runtime);
    const contextKey = `status.${runnable.id}`;

    if (runnable.strategy?.runStrategy === RunStrategy.SkipWhenSucceed) {
      //如果是成功后跳过策略
      const lastResult = await this.pipelineContext.get(contextKey);
      if (lastResult != null && lastResult === ResultType.success) {
        this.runtime.skip(runnable);
        await this.onChanged(this.runtime);
        return ResultType.skip;
      }
    }
    try {
      await run();
      this.runtime.success(runnable);
      await this.pipelineContext.set(contextKey, ResultType.success);
      await this.onChanged(this.runtime);
      return ResultType.success;
    } catch (e: any) {
      this.runtime.error(runnable, e);
      await this.pipelineContext.set(contextKey, ResultType.error);
      await this.onChanged(this.runtime);
      throw e;
    } finally {
      this.runtime.finally(runnable);
    }
  }

  private async runStages() {
    const resList: ResultType[] = [];
    for (const stage of this.pipeline.stages) {
      const res: ResultType = await this.runWithHistory(stage, "stage", async () => {
        await this.runStage(stage);
      });
      resList.push(res);
    }
    return this.compositionResultType(resList);
  }

  async runStage(stage: Stage) {
    const runnerList = [];
    for (const task of stage.tasks) {
      const runner = this.runWithHistory(task, "task", async () => {
        await this.runTask(task);
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

  private async runTask(task: Task) {
    const resList: ResultType[] = [];
    for (const step of task.steps) {
      step.runnableType = "step";
      const res: ResultType = await this.runWithHistory(step, "step", async () => {
        await this.runStep(step);
      });
      resList.push(res);
    }
    return this.compositionResultType(resList);
  }

  private async runStep(step: Step) {
    //执行任务
    const plugin: RegistryItem = pluginRegistry.get(step.type);
    const context: any = {
      logger: this.runtime.loggers[step.id],
      accessService: this.accessService,
      pipelineContext: this.pipelineContext,
      userContext: this.contextFactory.getContext("user", this.userId),
      http: request,
    };
    // @ts-ignore
    const instance = new plugin.target();
    // @ts-ignore
    const define: PluginDefine = plugin.define;
    //从outputContext读取输入参数
    Decorator.inject(define.input, instance, step.input, (item, key) => {
      if (item.component?.name === "pi-output-selector") {
        const contextKey = step.input[key];
        if (contextKey != null) {
          step.input[key] = this.runtime.context[contextKey];
        }
      }
    });

    Decorator.inject(define.autowire, instance, context);
    await instance.onInit();
    await instance.execute();

    //输出到output context
    _.forEach(define.output, (item, key) => {
      const contextKey = `step.${step.id}.${key}`;
      this.runtime.context[contextKey] = instance[key];
    });
  }
}
