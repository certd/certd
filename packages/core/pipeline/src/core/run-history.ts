import { HistoryResult, Pipeline, ResultType, Runnable, RunnableMap, Stage, Step, Task } from "../dt/index.js";
import * as _ from "lodash-es";
import { buildLogger, ILogger } from "@certd/basic";

export type HistoryStatus = {
  result: HistoryResult;
  logs: string[];
};

export type RunTrigger = {
  type: string; // user , timer
};

export function NewRunHistory(obj: any) {
  const history = new RunHistory(obj.id, obj.trigger, obj.pipeline);
  history.logs = obj.logs;
  history._loggers = obj.loggers;
  return history;
}
export class RunHistory {
  id!: any;
  pipeline!: Pipeline;
  logs: {
    [runnableId: string]: string[];
  } = {};
  _loggers: {
    [runnableId: string]: ILogger;
  } = {};
  trigger!: RunTrigger;

  constructor(runtimeId: any, trigger: RunTrigger, pipeline: Pipeline) {
    this.id = runtimeId;
    this.pipeline = pipeline;
    this.trigger = trigger;
  }

  clearNotificationStatus() {
    if (this.pipeline.notifications) {
      for (const item of this.pipeline!.notifications) {
        delete item.status;
      }
    }
    if (this.pipeline.afterTasks) {
      for (const item of this.pipeline!.afterTasks) {
        delete item.status;
      }
    }
  }

  start(runnable: Runnable): HistoryResult {
    const now = new Date().getTime();
    this.logs[runnable.id] = [];
    this._loggers[runnable.id] = buildLogger((text: string) => {
      this.logs[runnable.id].push(text);
    });
    const status: HistoryResult = {
      output: {},
      status: ResultType.start,
      startTime: now,
      result: ResultType.start,
    };
    runnable.status = status;
    this.log(runnable, `开始执行`);
    return status;
  }

  success(runnable: Runnable) {
    const now = new Date().getTime();
    const status = runnable.status;
    _.merge(status, {
      status: "success",
      endTime: now,
      result: "success",
    });
    this.log(runnable, `执行成功`);
  }

  skip(runnable: Runnable) {
    const now = new Date().getTime();
    const status = runnable.status;
    _.merge(status, {
      status: "success",
      endTime: now,
      result: "skip",
    });
    this.log(runnable, `跳过`);
  }

  disabled(runnable: Runnable) {
    const now = new Date().getTime();
    const status = runnable.status;
    _.merge(status, {
      status: "canceled",
      endTime: now,
      result: "disabled",
    });
    this.log(runnable, `禁用`);
  }

  error(runnable: Runnable, e: Error) {
    const now = new Date().getTime();
    const status = runnable.status;
    _.merge(status, {
      status: ResultType.error,
      endTime: now,
      result: ResultType.error,
      message: e.message,
    });

    this.logError(runnable, e);
  }

  cancel(runnable: Runnable) {
    const now = new Date().getTime();
    const status = runnable.status;
    _.merge(status, {
      status: ResultType.canceled,
      endTime: now,
      result: ResultType.canceled,
      message: "用户取消",
    });

    this.log(runnable, "任务取消");
  }

  log(runnable: Runnable, text: string) {
    // @ts-ignore
    this._loggers[runnable.id].info(`[${runnable.runnableType}] [${runnable.title}]<id:${runnable.id}> ：`, text);
  }

  logError(runnable: Runnable, e: Error) {
    const { cause, stack } = e;
    delete e.stack;
    delete e.cause;
    if (runnable.runnableType === "step") {
      this._loggers[runnable.id].error(stack, cause);
    }
    this._loggers[runnable.id].error(`[${runnable.runnableType}] [${runnable.title}]<id:${runnable.id}> ：`, e.message);
  }

  finally(runnable: Runnable) {
    //
  }
}

export class RunnableCollection {
  private collection: RunnableMap = {};
  private pipeline!: Pipeline;
  currentStep!: Step;
  constructor(pipeline?: Pipeline) {
    if (!pipeline) {
      return;
    }
    this.pipeline = pipeline;
    const map = this.toMap(pipeline);
    this.collection = map;
  }

  static initPipelineRunnableType(pipeline: Pipeline) {
    pipeline.runnableType = "pipeline";
    if (pipeline.stages === undefined) {
      pipeline.stages = [];
      return;
    }
    pipeline.stages.forEach(stage => {
      stage.runnableType = "stage";
      stage.tasks.forEach(task => {
        task.runnableType = "task";
        task.steps.forEach(step => {
          step.runnableType = "step";
        });
      });
    });
  }

  static each<T extends Runnable>(list: T[], exec: (item: Runnable) => void) {
    list.forEach(item => {
      exec(item);
      if (item.runnableType === "pipeline") {
        // @ts-ignore
        RunnableCollection.each<Stage>(item.stages, exec);
      } else if (item.runnableType === "stage") {
        // @ts-ignore
        RunnableCollection.each<Task>(item.tasks, exec);
      } else if (item.runnableType === "task") {
        // @ts-ignore
        RunnableCollection.each<Step>(item.steps, exec);
      }
    });
  }
  public toMap(pipeline: Pipeline) {
    const map: RunnableMap = {};

    RunnableCollection.each(pipeline.stages, item => {
      map[item.id] = item;
    });
    return map;
  }

  get(id: string): Runnable | undefined {
    return this.collection[id];
  }

  clear() {
    if (!this.pipeline) {
      return;
    }
    RunnableCollection.each(this.pipeline.stages, item => {
      item.status = undefined;
    });
  }

  clearById(id: string) {
    const runnable = this.collection[id];
    if (runnable?.status) {
      runnable.status.status = ResultType.none;
      runnable.status.result = ResultType.none;
      runnable.status.output = {};
      runnable.status.inputHash = "";
      // @ts-ignore
      runnable.input = {};
    }
  }

  add(runnable: Runnable) {
    this.collection[runnable.id] = runnable;
    if (runnable.runnableType === "step") {
      this.currentStep = runnable as Step;
    }
  }
}
