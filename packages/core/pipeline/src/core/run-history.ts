import { Context, HistoryResult, Log, Runnable } from "../d.ts";
import _ from "lodash";
import { buildLogger, logger } from "../utils/util.log";

export class RunHistory {
  constructor(runtimeId: any) {
    this.id = runtimeId;
  }

  id: any;
  logs: Log[] = [];
  context: Context = {};
  results: {
    [key: string]: HistoryResult;
  } = {};
  logger = logger;

  start(runnable: Runnable, runnableType: string) {
    const status = "start";
    const now = new Date().getTime();
    _.merge(runnable, { status, lastTime: now });
    const result: HistoryResult = {
      type: runnableType,
      startTime: new Date().getTime(),
      title: runnable.title,
      status,
      logs: [],
      logger: buildLogger((text) => {
        result.logs.push(text);
      }),
    };
    this.results[runnable.id] = result;
    this.log(runnable, result, `${runnable.title}<id:${runnable.id}> 开始执行`);
    return result;
  }

  success(runnable: Runnable, res?: any) {
    const status = "success";
    const now = new Date().getTime();
    _.merge(runnable, { status, lastTime: now });
    const result = this.results[runnable.id];
    _.merge(result, { status, endTime: now }, res);
    this.log(runnable, result, `${result.title}<id:${runnable.id}> 执行成功`);
  }

  error(runnable: Runnable, e: Error) {
    const status = "error";
    const now = new Date().getTime();
    _.merge(runnable, { status, lastTime: now });
    const result = this.results[runnable.id];
    _.merge(result, {
      status,
      endTime: now,
      errorMessage: e.message,
    });

    this.log(runnable, result, `${result.title}<id:${runnable.id}> 执行异常：${e.message}`, status);
  }

  log(runnable: Runnable, result: HistoryResult, text: string, level = "info") {
    const now = new Date().getTime();
    result.logger.info(`[${runnable.title}] [${result.type}]`, text);
    this.logs.push({
      time: now,
      level,
      title: runnable.title,
      text,
    });
  }

  finally(runnable: Runnable) {
    //
  }
}
