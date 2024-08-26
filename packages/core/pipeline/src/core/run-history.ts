import { HistoryResult, Pipeline, ResultType, Runnable, RunnableMap, Stage, Step, Task } from "../dt/index.js";
import _ from "lodash-es";
import { buildLogger } from "../utils/util.log.js";
import { Logger } from "log4js";

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
  id!: string;
  pipeline!: Pipeline;
  logs: {
    [runnableId: string]: string[];
  } = {};
  _loggers: {
    [runnableId: string]: Logger;
  } = {};
  trigger!: RunTrigger;

  constructor(runtimeId: any, trigger: RunTrigger, pipeline: Pipeline) {
    this.id = runtimeId;
    this.pipeline = pipeline;
    this.trigger = trigger;
  }

  start(runnable: Runnable): HistoryResult {
    const now = new Date().getTime();
    this.logs[runnable.id] = [];
    this._loggers[runnable.id] = buildLogger((text) => {
      this.logs[runnable.id].push(text);
    });
    const input = (runnable as Step).input;
    const status: HistoryResult = {
      output: {},
      input: _.cloneDeep(input),
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
    this._loggers[runnable.id].info(`[${runnable.title}]<id:${runnable.id}> [${runnable.runnableType}]`, text);
  }

  logError(runnable: Runnable, e: Error) {
    // @ts-ignore
    this._loggers[runnable.id].error(`[${runnable.title}]<id:${runnable.id}> [${runnable.runnableType}]`, e);
  }

  finally(runnable: Runnable) {
    //
  }
}

export class RunnableCollection {
  private collection: RunnableMap = {};
  private pipeline!: Pipeline;
  constructor(pipeline?: Pipeline) {
    if (!pipeline) {
      return;
    }
    this.pipeline = pipeline;
    const map = this.toMap(pipeline);
    this.collection = map;
  }

  static each<T extends Runnable>(list: T[], exec: (item: Runnable) => void) {
    list.forEach((item) => {
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

    RunnableCollection.each(pipeline.stages, (item) => {
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
    RunnableCollection.each(this.pipeline.stages, (item) => {
      item.status = undefined;
    });
  }

  add(runnable: Runnable) {
    this.collection[runnable.id] = runnable;
  }
}
