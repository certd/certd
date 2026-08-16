import { AfterTask, ConcurrencyStrategy, HistoryResult, NotificationWhen, Pipeline, ResultType, Runnable, RunStrategy, Stage, Step, Task, ResultError } from "../dt/index.js";
import { RunHistory, RunnableCollection } from "./run-history.js";
import { AbstractTaskPlugin, ITaskPlugin, PluginDefine, pluginRegistry, TaskInstanceContext, UserInfo } from "../plugin/index.js";
import { ContextFactory, IContext } from "./context.js";
import { IStorage } from "./storage.js";
import { buildLogger, createAxiosService, hashUtils, HttpRequestConfig, ILogger, logger, utils } from "@certd/basic";
import { IAccessService } from "../access/index.js";
import { RegistryItem } from "../registry/index.js";
import { Decorator } from "../decorator/index.js";
import { ICnameProxyService, IEmailService, IPluginConfigService, IServiceGetter, IUrlService } from "../service/index.js";
import { FileStore } from "./file-store.js";
import { cloneDeep, forEach, merge } from "lodash-es";
import { INotificationService, PipelineNotificationTypes } from "../notification/index.js";
import { pipelineEmitter } from "../service/emit.js";
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

      //清理通知 和后置任务的状态（start 时机的状态不需要显示，此后从干净状态重新判断）
      this.runtime.clearNotificationStatus();
      intervalFlushLogId = setInterval(async () => {
        await this.onChanged(this.runtime);
      }, 5000);

      let result: ResultType;
      let error: any = null;
      try {
        result = await this.runWithHistory(this.pipeline, "pipeline", async () => {
          const stagesResult = await this.runStages(this.pipeline);

          // 执行后置任务（失败时流水线整体视为执行失败）
          const afterTaskResult = await this.runAfterTasks({ result: stagesResult });
          return this.compositionResultType([...afterTaskResult, stagesResult]);
        });
      } catch (e: any) {
        result = ResultType.error;
        error = e;
        this.logger.error("pipeline 执行失败", e);
      }

      // 通知在后置任务之后发送（通知中附加后置任务执行结果与错误信息）
      const finalResult = result;
      if (finalResult === ResultType.success) {
        if (this.lastRuntime && this.lastRuntime.pipeline.status?.status === ResultType.error) {
          await this.notification("turnToSuccess");
        } else {
          await this.notification("success");
        }
      } else if (finalResult === ResultType.skip) {
        await this.notification("skip");
      } else if (finalResult === ResultType.error) {
        await this.notification("error", error);
      }

      return finalResult;
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
    const plugin: RegistryItem<AbstractTaskPlugin> = pluginRegistry.get(step.type);
    // @ts-ignore
    const define: PluginDefine = plugin?.define;

    const { instance, result, skipped } = await this.executePlugin(step, currentLogger);
    if (result === ResultType.skip && skipped) {
      // SkipWhenSucceed 跳过：状态与输出已在 executePlugin 内拷贝，无需结果处理
      return result;
    }

    //执行结果处理（插件主动返回 skip 时也会执行：插件可能已把输出写入实例属性，需写回历史）
    if (instance._result.clearLastStatus) {
      //是否需要清除所有状态
      this.lastStatusMap.clear();
    }
    //输出上下文变量到output context
    forEach(define.output, (item: any, key: any) => {
      step.status!.output[key] = instance[key];
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

  /**
   * 实例化插件并执行（任务步骤与后置任务共用同一执行链路）
   * 负责：插件实例化、系统参数注入、output-selector 解析、参数哈希与跳过判断、执行上下文构建与插件执行。
   * 后置任务通过伪步骤（无 strategy）复用，SkipWhenSucceed 跳过判断自然不触发。
   * @param step 步骤（后置任务传伪步骤）
   * @param currentLogger 当前节点日志logger
   */
  private async executePlugin(step: Step, currentLogger: ILogger): Promise<{ instance: ITaskPlugin; result: any; skipped: boolean }> {
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
    const pluginConfig = await this.options.pluginConfigService.getPluginConfig(define.name);
    //从配置读取输入参数
    const input = cloneDeep(step.input || {});
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

    //计算参数哈希与是否变化（供插件 ctx.inputChanged 与跳过判断使用；后置任务伪步骤不在 lastStatusMap 中，恒为 true）
    const newInputHash = hashUtils.md5(JSON.stringify(input));
    if (step.status) {
      step.status.inputHash = newInputHash;
    }
    const lastStatus = this.lastStatusMap.get(step.id);
    let inputChanged = true;
    const lastInputHash = lastStatus?.status?.inputHash;
    if (lastInputHash && newInputHash && lastInputHash === newInputHash) {
      //参数没有变化
      inputChanged = false;
    }
    //跳过判断（SkipWhenSucceed 策略；后置任务伪步骤无 strategy 不触发）
    if (step.strategy?.runStrategy === RunStrategy.SkipWhenSucceed && define.runStrategy !== RunStrategy.AlwaysRun) {
      const lastResult = lastStatus?.status?.status;
      if (lastResult != null && lastResult === ResultType.success && !inputChanged) {
        step.status!.output = lastStatus?.status?.output;
        step.status!.files = lastStatus?.status?.files;
        return { instance, result: ResultType.skip, skipped: true };
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
      emitter: pipelineEmitter,
      serviceGetter: this.options.serviceGetter,
      projectId: this.pipeline.projectId,
    };
    await instance.setCtx(taskCtx);

    await instance.onInstance();
    const result = await instance.execute();
    return { instance, result, skipped: false };
  }

  /**
   * 执行后置任务（流水线运行结束后触发）
   * 后置任务失败时流水线整体视为执行失败：收集所有失败任务的错误信息返回（不再单独发送通知）
   * @returns 聚合错误（有后置任务失败时返回 Error，否则返回 null）
   */
  private async runAfterTasks(opts: { result: ResultType }): Promise<ResultType[]> {
    const { result } = opts;
    const pipelineResult = result;
    if (!this.pipeline.afterTasks || this.pipeline.afterTasks.length === 0) {
      return [];
    }
    const afterTaskResults: ResultType[] = [];
    const errorList: { afterTask: AfterTask; err: Error }[] = [];
    for (const afterTask of this.pipeline.afterTasks) {
      if (this.abort.signal.aborted) {
        //用户取消，不再执行后续后置任务
        break;
      }
      if (afterTask.disabled) {
        // 已禁用：记录日志与状态（与任务 disabled 同语义）
        await this.markAfterTaskSkipped(afterTask, ResultType.disabled, `后置任务已禁用，不执行`, pipelineResult);
        continue;
      }
      if (!this.matchAfterTaskWhen(afterTask, pipelineResult)) {
        // 触发条件不满足：记录日志与跳过状态（与任务 skip 同语义）
        await this.markAfterTaskSkipped(afterTask, ResultType.skip, `后置任务未触发：当前运行结果 ${pipelineResult}，触发条件 ${(afterTask.when || []).join(",")}`, pipelineResult);
        continue;
      }
      try {
        const res = await this.runOneAfterTask(afterTask);
        afterTaskResults.push(res);
      } catch (err: any) {
        errorList.push({ afterTask, err });
      }
    }
    if (errorList.length > 0) {
      // 聚合所有失败后置任务的错误信息，抛出后由 runWithHistory 将流水线整体标记为失败
      const errMessage = errorList.map(item => `后置任务[${item.afterTask.title}]执行失败：${item.err.message}`).join("\n");
      throw new Error(errMessage);
    }
    return afterTaskResults;
  }

  /**
   * 记录后置任务未执行（未触发/禁用）的日志与状态
   * 日志与任务一致包含“开始/结束”两条；状态与任务 skip/disabled 一致，前端显示对应图标
   */
  private async markAfterTaskSkipped(afterTask: AfterTask, result: ResultType, message: string, pipelineResult: ResultType) {
    const logKey = this.buildAfterTaskLogKey(afterTask);
    const taskLogger = this.buildTaskLogger(logKey);
    const now = new Date().getTime();
    taskLogger.info(message);
    afterTask.status = {
      output: {},
      status: result === ResultType.disabled ? ResultType.canceled : ResultType.skip,
      result,
      startTime: now,
      endTime: now,
      message,
    };
  }

  /**
   * 判断后置任务触发条件是否满足（与通知 when 同语义）
   */
  private matchAfterTaskWhen(afterTask: AfterTask, pipelineResult: ResultType): boolean {
    const whenList = afterTask.when || [];
    if (whenList.includes("success") && pipelineResult === ResultType.success) {
      return true;
    }
    if (whenList.includes("error") && pipelineResult === ResultType.error) {
      return true;
    }
    // 失败转成功：本次成功且上一次运行失败
    if (whenList.includes("turnToSuccess") && pipelineResult === ResultType.success && this.lastRuntime?.pipeline?.status?.status === ResultType.error) {
      return true;
    }
    return false;
  }

  /**
   * 执行单个后置任务：记录状态与日志，失败时返回错误（由流水线整体承担失败结果）
   * @returns 失败时返回错误对象，成功/跳过/取消返回 null
   */
  private async runOneAfterTask(afterTask: AfterTask): Promise<ResultType> {
    const logKey = this.buildAfterTaskLogKey(afterTask);
    const taskLogger = this.buildTaskLogger(logKey);
    const status: HistoryResult = {
      output: {},
      status: ResultType.start,
      result: ResultType.start,
      startTime: new Date().getTime(),
    };
    afterTask.status = status;
    taskLogger.info(`后置任务开始执行，触发条件:${(afterTask.when || []).join(",")}`);
    try {
      if (this.abort.signal.aborted) {
        //用户取消
        status.status = ResultType.canceled;
        status.result = ResultType.canceled;
        status.endTime = new Date().getTime();
        status.message = "用户取消";
        taskLogger.warn("用户取消，后置任务不执行");
        return ResultType.canceled;
      }
      const result = await this.executeAfterTaskPlugin(afterTask, taskLogger);
      if (result === "skip") {
        // 跳过：记录日志与状态（与任务 skip 同语义）
        await this.markAfterTaskSkipped(afterTask, ResultType.skip, `后置任务已跳过`, ResultType.success);
        return ResultType.skip;
      }
      status.status = ResultType.success;
      status.result = ResultType.success;
      status.endTime = new Date().getTime();
      taskLogger.info("后置任务执行成功");
      return ResultType.success;
    } catch (e: any) {
      status.status = ResultType.error;
      status.result = ResultType.error;
      status.endTime = new Date().getTime();
      status.message = e.message;
      taskLogger.error(`后置任务执行失败：`, e);
      // 抛出由 runAfterTasks 聚合；聚合错误抛出后由 runWithHistory 将流水线整体标记为失败（不再单独发送通知）
      throw e;
    }
  }

  /**
   * 后置任务日志在运行历史中的key（与任务日志同机制，可点击查看）
   */
  private buildAfterTaskLogKey(afterTask: AfterTask): string {
    return `afterTask.${afterTask.id}`;
  }

  /**
   * 构建一个写入运行历史日志的logger（任务/通知/后置任务共用）
   */
  private buildTaskLogger(logKey: string): ILogger {
    if (this.runtime._loggers[logKey]) {
      return this.runtime._loggers[logKey];
    }
    const taskLogger = buildLogger((text: string) => {
      if (!this.runtime.logs[logKey]) {
        this.runtime.logs[logKey] = [];
      }
      this.runtime.logs[logKey].push(text);
    });
    this.runtime._loggers[logKey] = taskLogger;
    return taskLogger;
  }

  /**
   * 执行后置任务插件：与任务步骤共用同一执行链路（伪Step，插件可访问流水线上下文与运行结果）
   */
  private async executeAfterTaskPlugin(afterTask: AfterTask, taskLogger: ILogger): Promise<void | string> {
    const plugin: RegistryItem<AbstractTaskPlugin> = pluginRegistry.get(afterTask.type);
    // 伪步骤：与任务步骤完全相同的插件执行链路（无 strategy，跳过判断自然不触发）
    const pseudoStep: Step = {
      id: this.buildAfterTaskLogKey(afterTask),
      title: afterTask.title || plugin?.define?.name,
      type: afterTask.type,
      input: afterTask.input || {},
      status: afterTask.status,
    };
    const { result } = await this.executePlugin(pseudoStep, taskLogger);
    return result;
  }

  /**
   * 收集后置任务执行结果摘要（成功/失败/跳过等），用于附加到通知内容
   */
  private buildAfterTaskSummary(): string {
    if (!this.pipeline.afterTasks || this.pipeline.afterTasks.length === 0) {
      return "";
    }
    const lines: string[] = [];
    const resultTextMap: Record<string, string> = {
      success: "执行成功",
      error: "执行失败",
      skip: "未触发",
      disabled: "已禁用",
      canceled: "已取消",
    };
    for (const afterTask of this.pipeline.afterTasks) {
      const result = afterTask.status?.result;
      if (result == null) {
        continue;
      }
      if (result === ResultType.error) {
        lines.push(` - ${afterTask.title} 执行失败，错误详情：${afterTask.status?.message || ""}`);
      } else {
        lines.push(` - ${afterTask.title} ${resultTextMap[result] || result}`);
      }
    }
    if (lines.length === 0) {
      return "";
    }
    return `\n\n后置任务执行结果：\n${lines.join("\n")}`;
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
    } else if (when === "skip") {
      pipelineResult = "执行跳过";
      subject = `${pipelineResult}，${this.pipeline.title}【${this.pipeline.id}】`;
      content = `流水线ID:${this.pipeline.id}，运行ID:${this.runtime.id}\n\n${this.currentStatusMap?.currentStep?.title} 执行跳过\n`;
    } else {
      return;
    }

    templateData.errors = errors;
    templateData.pipelineResult = pipelineResult;
    templateData.title = subject;
    // 附加后置任务执行结果（通知在后置任务之后发送，可看到后置任务的成功/失败详情）
    const afterTaskSummary = this.buildAfterTaskSummary();
    if (afterTaskSummary) {
      content += afterTaskSummary;
    }
    templateData.content = content;

    for (const notification of this.pipeline.notifications) {
      // 记录通知日志（无论是否触发，便于确认通知发送情况）
      const logKey = `notification.${notification.id}`;
      const notificationLogger = this.buildTaskLogger(logKey);
      if (!notification.when.includes(when)) {
        // 触发条件不满足：记录“开始/结束”两条日志；若本次运行尚未触发过，则标记为跳过（与任务 skip 同语义）
        const skipMessage = `通知未触发：当前时机 ${when}，通知触发条件 ${(notification.when || []).join(",")}`;
        notificationLogger.info(skipMessage);
        if (notification.status == null) {
          const now = new Date().getTime();
          notification.status = {
            output: {},
            status: ResultType.skip,
            result: ResultType.skip,
            startTime: now,
            endTime: now,
            message: skipMessage,
          };
        }
        continue;
      }
      const notificationStatus: HistoryResult = {
        output: {},
        status: ResultType.start,
        result: ResultType.start,
        startTime: new Date().getTime(),
      };
      notification.status = notificationStatus;
      notificationLogger.info(`通知开始发送，触发时机:${when}，通知方式:${notification.type}，标题:${subject}`);

      try {
        if (notification.type === "email" && notification.options?.receivers) {
          await this.options.emailService?.sendByTemplate({
            type: PipelineNotificationTypes.PipelineResult,
            data: templateData,
            receivers: notification.options?.receivers,
          });
          notificationStatus.status = ResultType.success;
          notificationStatus.result = ResultType.success;
          notificationLogger.info("邮件通知发送成功");
        } else {
          //发送通知
          await this.options.notificationService.send({
            id: notification.notificationId,
            useDefault: true,
            useEmail: false,
            logger: notificationLogger,
            body: {
              notificationType: PipelineNotificationTypes.PipelineResult,
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
          notificationStatus.status = ResultType.success;
          notificationStatus.result = ResultType.success;
          notificationLogger.info("通知发送成功");
        }
      } catch (e: any) {
        notificationStatus.status = ResultType.error;
        notificationStatus.result = ResultType.error;
        notificationStatus.message = e.message;
        notificationLogger.error("通知发送失败：", e);
      } finally {
        notificationStatus.endTime = new Date().getTime();
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
