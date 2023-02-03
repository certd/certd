import { Context, HistoryResult, Pipeline, Runnable } from "../d.ts";
import _ from "lodash";
import { buildLogger } from "../utils/util.log";
import { Logger } from "log4js";

export type HistoryStatus = {
  result: HistoryResult;
  logs: string[];
};

export type RunTrigger = {
  type: string; // user , timer
};
export class RunHistory {
  id: string;
  //运行时上下文变量
  context: Context = {};
  pipeline: Pipeline;
  logs: {
    [runnableId: string]: string[];
  } = {};
  loggers: {
    [runnableId: string]: Logger;
  } = {};
  trigger: RunTrigger;
  constructor(runtimeId: any, trigger: RunTrigger, pipeline: Pipeline) {
    this.id = runtimeId;
    this.pipeline = pipeline;
    this.trigger = trigger;
  }

  start(runnable: Runnable): HistoryResult {
    const now = new Date().getTime();
    this.logs[runnable.id] = [];
    this.loggers[runnable.id] = buildLogger((text) => {
      this.logs[runnable.id].push(text);
    });
    const status: HistoryResult = {
      status: "start",
      startTime: now,
      result: "start",
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
      status: "error",
      endTime: now,
      result: "error",
      message: e.message,
    });

    this.logError(runnable, e);
  }

  log(runnable: Runnable, text: string) {
    // @ts-ignore
    this.loggers[runnable.id].info(`[${runnable.title}]<id:${runnable.id}> [${runnable.runnableType}]`, text);
  }

  logError(runnable: Runnable, e: Error) {
    // @ts-ignore
    this.loggers[runnable.id].error(`[${runnable.title}]<id:${runnable.id}> [${runnable.runnableType}]`, e);
  }

  finally(runnable: Runnable) {
    //
  }
}
