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

  nextTime: any;

  constructor(req: CronTaskReq, logger: ILogger) {
    this.cron = req.cron;
    this.job = req.job;
    this.name = req.name;
    this.logger = logger;
    this.genNextTime();
  }

  genNextTime() {
    if (!this.cron) {
      return null;
    }
    if (this.stoped) {
      return null;
    }
    const interval = parser.parseExpression(this.cron);
    const next = interval.next().getTime();
    this.logger.info(`[cron]  [${this.name}], cron:${this.cron}, next run :${new Date(next).toLocaleString()}`);
    this.nextTime = next;
    return next;
  }

  stop() {
    this.stoped = true;
  }
}
export class Cron {
  logger: ILogger;
  immediateTriggerOnce: boolean;

  queue: CronTask[] = [];
  constructor(opts: any) {
    this.logger = opts.logger;
    this.immediateTriggerOnce = opts.immediateTriggerOnce;
  }

  start() {
    this.logger.info('[cron] start');
    this.queue.forEach(task => {
      task.genNextTime();
    });

    setInterval(() => {
      const now = new Date().getTime();
      for (const task of this.queue) {
        if (task.nextTime <= now) {
          task.job().catch(e => {
            this.logger.error(`job execute error : [${task.name}]`, e);
          });
          task.genNextTime();
        }
      }
    }, 1000 * 60);
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
    this.queue.push(task);
    this.logger.info('当前定时任务数量：', this.getTaskSize());
  }

  remove(taskName: string) {
    this.logger.info(`[cron] remove : [${taskName}]`);
    const index = this.queue.findIndex(item => item.name === taskName);
    if (index !== -1) {
      this.queue[index].stop();
      this.queue.splice(index, 1);
    }
    this.logger.info('当前定时任务数量：', this.getTaskSize());
  }

  getTaskSize() {
    const tasks = Object.keys(this.queue);
    return tasks.length;
  }
}
