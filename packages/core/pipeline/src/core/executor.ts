import { ConcurrencyStrategy, NotificationWhen, Pipeline, ResultType, Runnable, RunStrategy, Stage, Step, Task, ResultError } from "../dt/index.js";
import { RunHistory, RunnableCollection } from "./run-history.js";
import { AbstractTaskPlugin, ITaskPlugin, PluginDefine, pluginRegistry, TaskInstanceContext, UserInfo } from "../plugin/index.js";
import { ContextFactory, IContext } from "./context.js";
import { IStorage } from "./storage.js";
import { createAxiosService, hashUtils, HttpRequestConfig, ILogger, logger, utils } from "@certd/basic";
import { IAccessService } from "../access/index.js";
import { RegistryItem } from "../registry/index.js";
import { Decorator } from "../decorator/index.js";
import { ICnameProxyService, IEmailService, IPluginConfigService, IServiceGetter, IUrlService } from "../service/index.js";
import { FileStore } from "./file-store.js";
import { cloneDeep, forEach, merge } from "lodash-es";
import { INotificationService } from "../notification/index.js";
import { taskEmitterCreate } from "../service/emit.js";
import { RunnableError } from "./exceptions.js";

export type SysInfo = {
  //系统标题
  title?: string;
};

export type ExecutorOptions = {
  pipeline: Pipeline;
  storage: IStorage;
  onChanged: (history: RunHistory) => Promise<void>;
  onFinished: (history: RunHistory) => Promise<void>;
  accessService: IAccessService;
  emailService: IEmailService;
  notificationService: INotificationService;
  cnameProxyService: ICnameProxyService;
  pluginConfigService: IPluginConfigService;
  urlService: IUrlService;
  fileRootDir?: string;
  user: UserInfo;
  baseURL?: string;
  sysInfo?: SysInfo;
  serviceGetter: IServiceGetter;
};

export class Executor {
  pipeline: Pipeline;
  runtime!: RunHistory;
  contextFactory: ContextFactory;
  logger: ILogger;
  pipelineContext!: IContext;
  currentStatusMap!: RunnableCollection;
  lastStatusMap!: RunnableCollection;
  lastRuntime!: RunHistory;
  options: ExecutorOptions;
  abort: AbortController = new AbortController();
  _inited = false;

  onChanged: (history: RunHistory) => Promise<void>;
  onFinished: (history: RunHistory) => Promise<void>;
  constructor(options: ExecutorOptions) {
    this.options = options;
    this.pipeline = cloneDeep(options.pipeline);
    this.onChanged = async (history: RunHistory) => {
      await options.onChanged(history);
    };
    this.onFinished = async (history: RunHistory) => {
      await options.onFinished(history);
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
    await this.onFinished(this.runtime);
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

      const result = await this.runWithHistory(this.pipeline, "pipeline", async () => {
        return await this.runStages(this.pipeline);
      });
      if (result === ResultType.success) {
        if (this.lastRuntime && this.lastRuntime.pipeline.status?.status === ResultType.error) {
          await this.notification("turnToSuccess");
        } else {
          await this.notification("success");
        }
      }
      return result;
    } catch (e: any) {
      await this.notification("error", e);
      this.logger.error("pipeline 执行失败", e);
    } finally {
      clearInterval(intervalFlushLogId);
      await this.onFinished(this.runtime);
      //保存之前移除logs
      const lastRuntime: any = {
        ...this.runtime,
      };
      delete lastRuntime.logs;
      delete lastRuntime._loggers;
      await this.pipelineContext.setObj("lastRuntime", lastRuntime);
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
      if (resultType == ResultType.disabled) {
        this.runtime.disabled(runnable);
        return resultType;
      }
      this.runtime.success(runnable);
      return ResultType.success;
    } catch (e: any) {
      if (e.name === "CancelError" || this.abort.signal.aborted) {
        this.runtime.cancel(runnable);
        return ResultType.canceled;
      } else {
        this.runtime.error(runnable, e);
      }
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
          const res = await this.runTask(task);
          return res;
        });
      };
      runnerList.push(runner);
    }

    let resList: ResultType[] = [];
    const errorList: ResultError[] = [];
    let errorMessage = "";
    if (stage.concurrency === ConcurrencyStrategy.Parallel) {
      //并行
      const pList = [];
      for (const item of runnerList) {
        pList.push(item());
      }
      resList = await Promise.all(pList);
    } else {
      //串行且报错继续
      for (let i = 0; i < runnerList.length; i++) {
        const runner = runnerList[i];
        try {
          resList[i] = await runner();
        } catch (e: any) {
          const t = stage.tasks[i];
          this.logger.error(`任务 ${t.title} 执行异常:`, e.message);
          resList[i] = ResultType.error;
          errorList.push({
            e,
            returnType: ResultType.error,
            runnable: t,
          });
          errorMessage += `任务${t.title}执行失败，错误详情：${e.message}；`;
        }
      }
      if (errorList.length > 0) {
        throw new RunnableError(errorMessage, errorList);
      }
    }
    return this.compositionResultType(resList);
  }

  compositionResultType(resList: ResultType[]): ResultType {
    let hasSuccess = false;
    let hasSkip = false;
    let hasDisabled = false;
    for (const type of resList) {
      if (type === ResultType.error) {
        return ResultType.error;
      } else if (type === ResultType.success) {
        hasSuccess = true;
      } else if (type === ResultType.skip) {
        hasSkip = true;
      } else if (type === ResultType.disabled) {
        hasDisabled = true;
      }
    }
    if (!hasSuccess && !hasSkip && hasDisabled) {
      //全是disabled
      return ResultType.disabled;
    }
    if (!hasSuccess && hasSkip) {
      //全是跳过
      return ResultType.skip;
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
      // @ts-ignore
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
    if (!plugin) {
      currentLogger.error(`未找到插件${step.type}`);
      throw new Error(`未找到插件${step.type}`);
    }
    //@ts-ignore
    let instance: ITaskPlugin = null;
    try {
      //@ts-ignore
      const pluginCls = await plugin.target();
      //@ts-ignore
      instance = new pluginCls();
    } catch (e: any) {
      currentLogger.error(`实例化插件失败:${step.type}:${e.message}`);
      throw new Error(`实例化插件失败`, e);
    }

    // @ts-ignore
    const define: PluginDefine = plugin.define;
    const pluginName = define.name;
    const pluginConfig = await this.options.pluginConfigService.getPluginConfig(pluginName);
    //从outputContext读取输入参数
    const input = cloneDeep(step.input);
    const sysInput = pluginConfig.sysSetting?.input || {};
    //注入系统设置参数
    for (const sysInputKey in sysInput) {
      input[sysInputKey] = sysInput[sysInputKey];
    }

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
            currentLogger.warn(`${item.title}的配置未找到对应的输出值，请确认对应的前置任务是否存在或者是否执行正确`);
          }
        }
      }
    });

    const newInputHash = hashUtils.md5(JSON.stringify(input));
    step.status!.inputHash = newInputHash;
    //判断是否需要跳过
    const lastNode = this.lastStatusMap.get(step.id);
    const lastResult = lastNode?.status?.status;
    let inputChanged = true;
    const lastInputHash = lastNode?.status?.inputHash;
    if (lastInputHash && newInputHash && lastInputHash === newInputHash) {
      //参数没有变化
      inputChanged = false;
    }
    if (step.strategy?.runStrategy === RunStrategy.SkipWhenSucceed && define.runStrategy !== RunStrategy.AlwaysRun) {
      if (lastResult != null && lastResult === ResultType.success && !inputChanged) {
        step.status!.output = lastNode?.status?.output;
        step.status!.files = lastNode?.status?.files;
        return ResultType.skip;
      }
    }

    const http = createAxiosService({ logger: currentLogger });
    const download = async (config: HttpRequestConfig, savePath: string) => {
      await utils.download({
        http,
        logger: currentLogger,
        config,
        savePath,
      });
    };
    const taskCtx: TaskInstanceContext = {
      pipeline: this.pipeline,
      runtime: this.runtime,
      step,
      define: cloneDeep(define),
      lastStatus,
      http,
      download,
      logger: currentLogger,
      inputChanged,
      accessService: this.options.accessService,
      emailService: this.options.emailService,
      cnameProxyService: this.options.cnameProxyService,
      pluginConfigService: this.options.pluginConfigService,
      notificationService: this.options.notificationService,
      urlService: this.options.urlService,
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
      emitter: taskEmitterCreate({
        step,
        pipeline: this.pipeline,
      }),
      serviceGetter: this.options.serviceGetter,
    };
    instance.setCtx(taskCtx);

    await instance.onInstance();
    const result = await instance.execute();
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
      let vars = await this.pipelineContext.getObj("vars");
      vars = vars || {};
      merge(vars, instance._result.pipelineVars);
      await this.pipelineContext.setObj("vars", vars);
    }
    if (Object.keys(instance._result.pipelinePrivateVars).length > 0) {
      // 判断 pipelineVars 有值时更新
      let vars = await this.pipelineContext.getObj("privateVars");
      vars = vars || {};
      merge(vars, instance._result.pipelinePrivateVars);
      await this.pipelineContext.setObj("privateVars", vars);
    }

    return result;
  }

  async notification(when: NotificationWhen, error?: any) {
    if (!this.pipeline.notifications) {
      return;
    }
    const url = await this.options.urlService.getPipelineDetailUrl(this.pipeline.id, this.runtime.id);
    let subject = "";
    let content = "";
    const errorMessage = error?.message;
    const templateData: any = {
      pipelineId: this.pipeline.id,
      historyId: this.runtime.id,
      pipelineTitle: this.pipeline.title,
    };
    let pipelineResult = "";
    let errors = "";
    if (when === "start") {
      pipelineResult = "开始执行";
      subject = `${pipelineResult}，${this.pipeline.title}【${this.pipeline.id}】`;
      content = `流水线ID:${this.pipeline.id}，运行ID:${this.runtime.id}`;
    } else if (when === "success") {
      pipelineResult = "执行成功";
      subject = `${pipelineResult}，${this.pipeline.title}【${this.pipeline.id}】`;
      content = `流水线ID:${this.pipeline.id}，运行ID:${this.runtime.id}`;
    } else if (when === "turnToSuccess") {
      pipelineResult = "执行成功（失败转成功）";
      subject = `${pipelineResult}，${this.pipeline.title}【${this.pipeline.id}】`;
      content = `流水线ID:${this.pipeline.id}，运行ID:${this.runtime.id}`;
    } else if (when === "error") {
      pipelineResult = "执行失败";
      subject = `${pipelineResult}，${this.pipeline.title}【${this.pipeline.id}】`;
      if (error instanceof RunnableError) {
        const runnableError = error as RunnableError;
        content = `流水线ID:${this.pipeline.id}，运行ID:${this.runtime.id}\n\n`;
        for (const re of runnableError.errors) {
          errors += ` - ${re.runnable.title} 执行失败，错误详情：${re.e?.message || re.e?.error?.message}\n\n`;
        }
        content += errors;
      } else {
        errors = error.message;
        content = `流水线ID:${this.pipeline.id}，运行ID:${this.runtime.id}\n\n${this.currentStatusMap?.currentStep?.title} 执行失败\n\n错误详情:${error.message}`;
      }
    } else {
      return;
    }

    templateData.errors = errors;
    templateData.pipelineResult = pipelineResult;
    templateData.title = subject;
    templateData.content = content;

    for (const notification of this.pipeline.notifications) {
      if (!notification.when.includes(when)) {
        continue;
      }

      if (notification.type === "email" && notification.options?.receivers) {
        try {
          await this.options.emailService?.sendByTemplate({
            type: "pipelineResult",
            data: templateData,
            receivers: notification.options?.receivers,
          });
        } catch (e) {
          logger.error("send email error", e);
        }
      } else {
        try {
          //发送通知
          await this.options.notificationService.send({
            id: notification.notificationId,
            useDefault: true,
            useEmail: false,
            logger: this.logger,
            body: {
              notificationType: "pipelineResult",
              title: subject,
              content,
              userId: this.pipeline.userId,
              pipeline: this.pipeline,
              result: this.lastRuntime?.pipeline?.status,
              errorMessage,
              url,
              ...templateData,
            },
          });
        } catch (e) {
          logger.error("send notification error", e);
        }
      }
    }
  }

  /**
   *
   * @param stepId 如果==ALL 清除所有
   */
  clearLastStatus(stepId: string) {
    if (stepId === "ALL") {
      this.lastStatusMap.clear();
      return;
    }
    this.lastStatusMap.clearById(stepId);
  }
}
