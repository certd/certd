import { Context, HistoryResult, Log, Runnable } from "../d.ts/pipeline";
import _ from "lodash";

export class RunHistory {
  id: any;
  logs: Log[] = [];
  context: Context = {};
  results: {
    [key: string]: HistoryResult;
  } = {};

  start(runnable: Runnable) {
    const status = "ing";
    const now = new Date().getTime();
    _.merge(runnable, { status, lastTime: now });
    this.results[runnable.id] = {
      startTime: new Date().getTime(),
      title: runnable.title,
      status,
    };
    this.log(runnable, `${runnable.title}<${runnable.id}> 开始执行`);
  }

  success(runnable: Runnable, result?: any) {
    const status = "success";
    const now = new Date().getTime();
    _.merge(runnable, { status, lastTime: now });
    _.merge(this.results[runnable.id], { status, endTime: now }, result);
    this.log(
      runnable,
      `${this.results[runnable.id].title}<${runnable.id}> 执行成功`
    );
  }

  error(runnable: Runnable, e: Error) {
    const status = "error";
    const now = new Date().getTime();
    _.merge(runnable, { status, lastTime: now });
    _.merge(this.results[runnable.id], {
      status,
      endTime: now,
      errorMessage: e.message,
    });

    this.log(
      runnable,
      `${this.results[runnable.id].title}<${runnable.id}> 执行异常：${
        e.message
      }`,
      status
    );
  }

  log(runnable: Runnable, text: string, level = "info") {
    this.logs.push({
      time: new Date().getTime(),
      level,
      title: runnable.title,
      text,
    });
  }
}
