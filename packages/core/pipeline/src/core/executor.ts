import { ConcurrencyStrategy, NotificationWhen, Pipeline, ResultType, Runnable, RunStrategy, Stage, Step, Task } from "../dt/index.js";
import { RunHistory, RunnableCollection } from "./run-history.js";
import { AbstractTaskPlugin, PluginDefine, pluginRegistry, TaskInstanceContext, UserInfo } from "../plugin/index.js";
import { ContextFactory, IContext } from "./context.js";
import { IStorage } from "./storage.js";
import { createAxiosService, hashUtils, logger, utils } from "../utils/index.js";
import { Logger } from "log4js";
import { IAccessService } from "../access/index.js";
import { RegistryItem } from "../registry/index.js";
import { Decorator } from "../decorator/index.js";
import { ICnameProxyService, IEmailService, IPluginConfigService } from "../service/index.js";
import { FileStore } from "./file-store.js";
import { cloneDeep, forEach, merge } from "lodash-es";

export type ExecutorOptions = {
  pipeline: Pipeline;
  storage: IStorage;
  onChanged: (history: RunHistory) => Promise<void>;
  accessService: IAccessService;
  emailService: IEmailService;
  cnameProxyService: ICnameProxyService;
  pluginConfigService: IPluginConfigService;
  fileRootDir?: string;
  user: UserInfo;
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

  _inited = false;

  onChanged: (history: RunHistory) => Promise<void>;
  constructor(options: ExecutorOptions) {
    this.options = options;
    this.pipeline = cloneDeep(options.pipeline);
    this.onChanged = async (history: RunHistory) => {
      await options.onChanged(history);
    };
    this.pipeline.userId = options.user.id;
    this.contextFactory = new ContextFactory(options.storage);
    this.logger = logger;
    this.pipelineContext = this.contextFactory.getContext("pipeline", this.pipeline.id);
  }

  async init() {
    if (this._inited) {
      return;
    }
    this._inited = true;
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
    let intervalFlushLogId: any = undefined;
    try {
      await this.init();
      const trigger = { type: triggerType };
      // 读取last
      this.runtime = new RunHistory(runtimeId, trigger, this.pipeline);
      this.logger.info(`pipeline.${this.pipeline.id}  start`);
      await this.notification("start");

      this.runtime.start(this.pipeline);
      intervalFlushLogId = setInterval(async () => {
        await this.onChanged(this.runtime);
      }, 5000);

      await this.runWithHistory(this.pipeline, "pipeline", async () => {
        return await this.runStages(this.pipeline);
      });
      if (this.lastRuntime && this.lastRuntime.pipeline.status?.status === ResultType.error) {
        await this.notification("turnToSuccess");
      }
      await this.notification("success");
    } catch (e: any) {
      await this.notification("error", e);
      this.logger.error("pipeline 执行失败", e);
    } finally {
      clearInterval(intervalFlushLogId);
      await this.onChanged(this.runtime);
      await this.pipelineContext.setObj("lastRuntime", this.runtime);
      this.logger.info(`pipeline.${this.pipeline.id}  end`);
    }
  }

  async runWithHistory(runnable: Runnable, runnableType: string, run: () => Promise<ResultType | void>) {
    runnable.runnableType = runnableType;

    this.runtime.start(runnable);

    try {
      if (runnable.disabled) {
        //该任务被禁用
        this.runtime.disabled(runnable);
        return ResultType.disabled;
      }

      await this.onChanged(this.runtime);

      if (this.abort.signal.aborted) {
        this.runtime.cancel(runnable);
        return ResultType.canceled;
      }
      const resultType = await run();
      if (this.abort.signal.aborted) {
        this.runtime.cancel(runnable);
        return ResultType.canceled;
      }
      if (resultType == ResultType.skip) {
        this.runtime.skip(runnable);
        return resultType;
      }
      this.runtime.success(runnable);
      return ResultType.success;
    } catch (e: any) {
      this.runtime.error(runnable, e);
      throw e;
    } finally {
      this.runtime.finally(runnable);
      await this.onChanged(this.runtime);
    }
  }

  private async runStages(pipeline: Pipeline) {
    const resList: ResultType[] = [];
    for (const stage of pipeline.stages) {
      const res: ResultType = await this.runWithHistory(stage, "stage", async () => {
        return await this.runStage(stage);
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
          return ResultType.success;
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
        return await this.runStep(step);
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
    const pluginName = define.name;
    const pluginConfig = await this.options.pluginConfigService.getPluginConfig(pluginName);
    //从outputContext读取输入参数
    const input = cloneDeep(step.input);
    Decorator.inject(define.input, instance, input, (item, key) => {
      if (item.component?.name === "output-selector") {
        const contextKey = input[key];
        if (contextKey != null) {
          if (typeof contextKey !== "string") {
            throw new Error(`步骤${step.title}的${item.title}属性必须为String类型，请重新配置该属性`);
          }
          // "cert": "step.-BNFVPMKPu2O-i9NiOQxP.cert",
          const arr = contextKey.split(".");
          const id = arr[1];
          const outputKey = arr[2];
          input[key] = this.currentStatusMap.get(id)?.status?.output[outputKey] ?? this.lastStatusMap.get(id)?.status?.output[outputKey];
          if (input[key] == null) {
            this.logger.warn(`${item.title}的配置未找到对应的输出值，请确认对应的前置任务是否存在或者是否执行正确`);
          }
        }
      }
    });

    const sysInput = pluginConfig.sysSetting?.input || {};
    //注入系统设置参数
    for (const sysInputKey in sysInput) {
      input[sysInputKey] = sysInput[sysInputKey];
    }

    const newInputHash = hashUtils.md5(JSON.stringify(input));
    step.status!.inputHash = newInputHash;
    //判断是否需要跳过
    const lastNode = this.lastStatusMap.get(step.id);
    const lastResult = lastNode?.status?.status;
    let inputChanged = true;
    const lastInputHash = lastNode?.status?.inputHash;
    if (lastInputHash && newInputHash && lastInputHash === newInputHash) {
      //参数有变化
      inputChanged = false;
    }
    if (step.strategy?.runStrategy === RunStrategy.SkipWhenSucceed) {
      if (lastResult != null && lastResult === ResultType.success && !inputChanged) {
        step.status!.output = lastNode?.status?.output;
        step.status!.files = lastNode?.status?.files;
        return ResultType.skip;
      }
    }

    const http = createAxiosService({ logger: currentLogger });
    const taskCtx: TaskInstanceContext = {
      pipeline: this.pipeline,
      step,
      lastStatus,
      http,
      logger: currentLogger,
      inputChanged,
      accessService: this.options.accessService,
      emailService: this.options.emailService,
      cnameProxyService: this.options.cnameProxyService,
      pluginConfigService: this.options.pluginConfigService,
      pipelineContext: this.pipelineContext,
      userContext: this.contextFactory.getContext("user", this.options.user.id),
      fileStore: new FileStore({
        scope: this.pipeline.id,
        parent: this.runtime.id,
        rootDir: this.options.fileRootDir,
      }),
      signal: this.abort.signal,
      utils,
      user: this.options.user,
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
    forEach(define.output, (item: any, key: any) => {
      step.status!.output[key] = instance[key];
      // const stepOutputKey = `step.${step.id}.${key}`;
      // this.runtime.context[stepOutputKey] = instance[key];
    });
    step.status!.files = instance.getFiles();
    //更新pipeline vars
    if (Object.keys(instance._result.pipelineVars).length > 0) {
      // 判断 pipelineVars 有值时更新
      const vars = this.pipelineContext.getObj("vars");
      merge(vars, instance._result.pipelineVars);
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
      subject = `【CertD】开始执行，【${this.pipeline.id}】${this.pipeline.title}`;
      content = `buildId:${this.runtime.id}`;
    } else if (when === "success") {
      subject = `【CertD】执行成功，【${this.pipeline.id}】${this.pipeline.title}`;
      content = `buildId:${this.runtime.id}`;
    } else if (when === "turnToSuccess") {
      subject = `【CertD】执行成功（错误转成功），【${this.pipeline.id}】${this.pipeline.title}`;
      content = `buildId:${this.runtime.id}`;
    } else if (when === "error") {
      subject = `【CertD】执行失败，【${this.pipeline.id}】${this.pipeline.title}`;
      content = `buildId:${this.runtime.id}\nerror:${error.message}`;
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

  clearLastStatus(stepId: string) {
    this.lastStatusMap.clearById(stepId);
  }
}
