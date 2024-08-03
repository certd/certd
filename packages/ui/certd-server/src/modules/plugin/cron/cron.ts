import parser from 'cron-parser';
import { ILogger } from '@certd/pipeline';

export type CronTaskReq = {
  /**
   * 为空则为单次执行
   */
  cron: string;
  job: () => Promise<void>;
  name: string;
};

export class CronTask {
  logger: ILogger;
  cron: string;
  job: () => Promise<void>;
  name: string;
  stoped = false;

  timeoutId: any;

  constructor(req: CronTaskReq, logger: ILogger) {
    this.cron = req.cron;
    this.job = req.job;
    this.name = req.name;
    this.logger = logger;
    this.start();
  }

  start() {
    if (!this.cron) {
      return;
    }
    if (this.stoped) {
      return;
    }
    const interval = parser.parseExpression(this.cron);
    const next = interval.next().getTime();
    const now = Date.now();
    const delay = next - now;
    this.timeoutId = setTimeout(async () => {
      try {
        if (this.stoped) {
          return;
        }
        await this.job();
      } catch (e) {
        this.logger.error(`[cron] job error : [${this.name}]`, e);
      }
      this.start();
    }, delay);
  }

  stop() {
    this.stoped = true;
    clearTimeout(this.timeoutId);
  }
}
export class Cron {
  logger: ILogger;
  immediateTriggerOnce: boolean;

  bucket: Record<string, CronTask> = {};

  constructor(opts: any) {
    this.logger = opts.logger;
    this.immediateTriggerOnce = opts.immediateTriggerOnce;
  }

  register(req: CronTaskReq) {
    if (!req.cron) {
      this.logger.info(`[cron] register once : [${req.name}]`);
      req.job().catch(e => {
        this.logger.error(`job execute error : [${req.name}]`, e);
      });
      return;
    }
    this.logger.info(`[cron] register cron : [${req.name}] ,${req.cron}`);

    const task = new CronTask(req, this.logger);
    this.bucket[task.name] = task;
    this.logger.info('当前定时任务数量：', this.getTaskSize());
  }

  remove(taskName: string) {
    this.logger.info(`[cron] remove : [${taskName}]`);
    const task = this.bucket[taskName];
    if (task) {
      task.stop();
      delete this.bucket[taskName];
    }
  }

  getTaskSize() {
    const tasks = Object.keys(this.bucket);
    return tasks.length;
  }
}
