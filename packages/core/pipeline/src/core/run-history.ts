import { Context, HistoryResult, Runnable } from "../d.ts";
import _ from "lodash";
import { buildLogger } from "../utils/util.log";
import { Logger } from "log4js";

export type HistoryStatus = {
  runnable: Runnable;
  result: HistoryResult;
  logs: string[];
  logger: Logger;
};

export class RunHistory {
  constructor(runtimeId: any) {
    this.id = runtimeId;
  }

  id: any;
  //运行时上下文变量
  context: Context = {};
  status: {
    [nodeId: string]: HistoryStatus;
  } = {};

  start(runnable: Runnable): HistoryStatus {
    const now = new Date().getTime();
    const status: HistoryStatus = {
      runnable,
      result: {
        status: "start",
        startTime: now,
      },
      logs: [],
      logger: buildLogger((text) => {
        status.logs.push(text);
      }),
    };
    this.status[runnable.id] = status;
    this.log(status, `开始执行`);
    return status;
  }

  success(runnable: Runnable) {
    const now = new Date().getTime();
    const status = this.status[runnable.id];
    _.merge(status, {
      result: {
        status: "success",
        endTime: now,
      },
    });
    this.log(status, `执行成功`);
  }

  error(runnable: Runnable, e: Error) {
    const now = new Date().getTime();
    const status = this.status[runnable.id];
    _.merge(status, {
      result: {
        status: "error",
        endTime: now,
        message: e.message,
      },
    });

    this.log(status, `执行异常：${e.message}`);
  }

  log(status: HistoryStatus, text: string) {
    const runnable = status.runnable;
    status.logger.info(`[${runnable.title}]<id:${runnable.id}> [${runnable.runnableType}]`, text);
  }

  finally(runnable: Runnable) {
    //
  }
}
