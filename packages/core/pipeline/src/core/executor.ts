import { ConcurrencyStrategy, NotificationWhen, Pipeline, ResultType, Runnable, RunStrategy, Stage, Step, Task } from "../dt/index.js";
import _ from "lodash-es";
import { RunHistory, RunnableCollection } from "./run-history.js";
import { AbstractTaskPlugin, PluginDefine, pluginRegistry, TaskInstanceContext } from "../plugin/index.js";
import { ContextFactory, IContext } from "./context.js";
import { IStorage } from "./storage.js";
import { logger } from "../utils/util.log.js";
import { Logger } from "log4js";
import { createAxiosService } from "../utils/util.request.js";
import { IAccessService } from "../access/index.js";
import { RegistryItem } from "../registry/index.js";
import { Decorator } from "../decorator/index.js";
import { IEmailService } from "../service/index.js";
import { FileStore } from "./file-store.js";
// import { TimeoutPromise } from "../utils/util.promise.js";

export type ExecutorOptions = {
  userId: any;
  pipeline: Pipeline;
  storage: IStorage;
  onChanged: (history: RunHistory) => Promise<void>;
  accessService: IAccessService;
  emailService: IEmailService;
  fileRootDir?: string;
};

export class Executor {
  pipeline: Pipeline;
  runtime!: RunHistory;
  contextFactory: ContextFactory;
  logger: Logger;
  pipelineContext!: IContext;
  currentStatusMap!: RunnableCollection;
  lastStatusMap!: RunnableCollection;
  lastRuntime!: RunHistory;
  options: ExecutorOptions;
  abort: AbortController = new AbortController();

  onChanged: (history: RunHistory) => Promise<void>;
  constructor(options: ExecutorOptions) {
    this.options = options;
    this.pipeline = _.cloneDeep(options.pipeline);
    this.onChanged = async (history: RunHistory) => {
      await options.onChanged(history);
    };
    this.pipeline.userId = options.userId;
    this.contextFactory = new ContextFactory(options.storage);
    this.logger = logger;
    this.pipelineContext = this.contextFactory.getContext("pipeline", this.pipeline.id);
  }

  async init() {
    const lastRuntime = await this.pipelineContext.getObj(`lastRuntime`);
    this.lastRuntime = lastRuntime;
    this.lastStatusMap = new RunnableCollection(lastRuntime?.pipeline);
    this.currentStatusMap = new RunnableCollection(this.pipeline);
  }

  async cancel() {
    this.abort.abort();
    this.runtime?.cancel(this.pipeline);
    await this.onChanged(this.runtime);
  }

  async run(runtimeId: any = 0, triggerType: string) {
    try {
      await this.init();
      const trigger = { type: triggerType };
      // 读取last
      this.runtime = new RunHistory(runtimeId, trigger, this.pipeline);
      this.logger.info(`pipeline.${this.pipeline.id}  start`);
      await this.notification("start");
      await this.runWithHistory(this.pipeline, "pipeline", async () => {
        await this.runStages(this.pipeline);
      });
      if (this.lastRuntime && this.lastRuntime.pipeline.status?.status === ResultType.error) {
        await this.notification("turnToSuccess");
      }
      await this.notification("success");
    } catch (e) {
      await this.notification("error", e);
      this.logger.error("pipeline 执行失败", e);
    } finally {
      await this.pipelineContext.setObj("lastRuntime", this.runtime);
      this.logger.info(`pipeline.${this.pipeline.id}  end`);
    }
  }

  async runWithHistory(runnable: Runnable, runnableType: string, run: () => Promise<void>) {
    runnable.runnableType = runnableType;
    this.runtime.start(runnable);
    await this.onChanged(this.runtime);

    if (runnable.strategy?.runStrategy === RunStrategy.SkipWhenSucceed) {
      //如果是成功后跳过策略
      const lastNode = this.lastStatusMap.get(runnable.id);
      const lastResult = lastNode?.status?.status;
      const lastInput = JSON.stringify(lastNode?.status?.input);
      let inputChanged = false;
      if (runnableType === "step") {
        const step = runnable as Step;
        const input = JSON.stringify(step.input);
        if (input != null && lastInput !== input) {
          //参数有变化
          inputChanged = true;
        }
      }
      if (lastResult != null && lastResult === ResultType.success && !inputChanged) {
        runnable.status!.output = lastNode?.status?.output;
        runnable.status!.files = lastNode?.status?.files;
        this.runtime.skip(runnable);
        await this.onChanged(this.runtime);
        return ResultType.skip;
      }
    }
    const intervalFlushLogId = setInterval(async () => {
      await this.onChanged(this.runtime);
    }, 5000);

    // const timeout = runnable.timeout ?? 20 * 60 * 1000;
    try {
      if (this.abort.signal.aborted) {
        this.runtime.cancel(runnable);
        return ResultType.canceled;
      }
      await run();
      if (this.abort.signal.aborted) {
        this.runtime.cancel(runnable);
        return ResultType.canceled;
      }
      this.runtime.success(runnable);
      return ResultType.success;
    } catch (e: any) {
      this.runtime.error(runnable, e);
      throw e;
    } finally {
      this.runtime.finally(runnable);
      clearInterval(intervalFlushLogId);
      await this.onChanged(this.runtime);
    }
  }

  private async runStages(pipeline: Pipeline) {
    const resList: ResultType[] = [];
    for (const stage of pipeline.stages) {
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
      const runner = async () => {
        return this.runWithHistory(task, "task", async () => {
          await this.runTask(task);
        });
      };
      runnerList.push(runner);
    }

    let resList: ResultType[] = [];
    if (stage.concurrency === ConcurrencyStrategy.Parallel) {
      const pList = [];
      for (const item of runnerList) {
        pList.push(item());
      }
      resList = await Promise.all(pList);
    } else {
      for (let i = 0; i < runnerList.length; i++) {
        const runner = runnerList[i];
        resList[i] = await runner();
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
    const currentLogger = this.runtime._loggers[step.id];
    this.currentStatusMap.add(step);
    const lastStatus = this.lastStatusMap.get(step.id);
    //执行任务
    const plugin: RegistryItem<AbstractTaskPlugin> = pluginRegistry.get(step.type);

    // @ts-ignore
    const instance: ITaskPlugin = new plugin.target();
    // @ts-ignore
    const define: PluginDefine = plugin.define;
    //从outputContext读取输入参数
    Decorator.inject(define.input, instance, step.input, (item, key) => {
      if (item.component?.name === "pi-output-selector") {
        const contextKey = step.input[key];
        if (contextKey != null) {
          // "cert": "step.-BNFVPMKPu2O-i9NiOQxP.cert",
          const arr = contextKey.split(".");
          const id = arr[1];
          const outputKey = arr[2];
          step.input[key] = this.currentStatusMap.get(id)?.status?.output[outputKey] ?? this.lastStatusMap.get(id)?.status?.output[outputKey];
        }
      }
    });

    const http = createAxiosService({ logger: currentLogger });
    const taskCtx: TaskInstanceContext = {
      pipeline: this.pipeline,
      step,
      lastStatus,
      http,
      logger: currentLogger,
      accessService: this.options.accessService,
      emailService: this.options.emailService,
      pipelineContext: this.pipelineContext,
      userContext: this.contextFactory.getContext("user", this.options.userId),
      fileStore: new FileStore({
        scope: this.pipeline.id,
        parent: this.runtime.id,
        rootDir: this.options.fileRootDir,
      }),
      signal: this.abort.signal,
    };
    instance.setCtx(taskCtx);

    await instance.onInstance();
    await instance.execute();
    //执行结果处理
    if (instance._result.clearLastStatus) {
      //是否需要清除所有状态
      this.lastStatusMap.clear();
    }
    //输出上下文变量到output context
    _.forEach(define.output, (item: any, key: any) => {
      step.status!.output[key] = instance[key];
      // const stepOutputKey = `step.${step.id}.${key}`;
      // this.runtime.context[stepOutputKey] = instance[key];
    });
    step.status!.files = instance.getFiles();

    //更新pipeline vars
    if (Object.keys(instance._result.pipelineVars).length > 0) {
      // 判断 pipelineVars 有值时更新
      const vars = this.pipelineContext.getObj("vars");
      _.merge(vars, instance._result.pipelineVars);
      await this.pipelineContext.setObj("vars", vars);
    }
  }

  async notification(when: NotificationWhen, error?: any) {
    if (!this.pipeline.notifications) {
      return;
    }
    let subject = "";
    let content = "";
    if (when === "start") {
      subject = `【CertD】开始执行，${this.pipeline.title}, buildId:${this.runtime.id}`;
      content = subject;
    } else if (when === "success") {
      subject = `【CertD】执行成功，${this.pipeline.title}, buildId:${this.runtime.id}`;
      content = subject;
    } else if (when === "turnToSuccess") {
      subject = `【CertD】执行成功（错误转成功），${this.pipeline.title}, buildId:${this.runtime.id}`;
      content = subject;
    } else if (when === "error") {
      subject = `【CertD】执行失败，${this.pipeline.title}, buildId:${this.runtime.id}`;
      content = `<pre>${error.message}</pre>`;
    } else {
      return;
    }

    for (const notification of this.pipeline.notifications) {
      if (!notification.when.includes(when)) {
        continue;
      }
      if (notification.type === "email") {
        try {
          await this.options.emailService?.send({
            userId: this.pipeline.userId,
            subject,
            content,
            receivers: notification.options.receivers,
          });
        } catch (e) {
          logger.error("send email error", e);
        }
      }
    }
  }
}
