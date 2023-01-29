import cron from 'node-cron';
export type CronTask = {
  /**
   * 为空则为单次执行
   */
  cron: string;
  job: () => Promise<void>;
  name: string;
};
export class Cron {
  logger;
  constructor(opts) {
    this.logger = opts.logger;
  }

  register(task: CronTask) {
    if (!task.cron) {
      this.logger.info(`[cron] register once : [${task.name}]`);
      task.job();
      return;
    }
    this.logger.info(`[cron] register cron : [${task.name}] ,${task.cron}`);
    cron.schedule(task.cron, task.job, {
      name: task.name,
    });
  }

  remove(taskName: string) {
    this.logger.info(`[cron] remove : [${taskName}]`);
    const tasks = cron.getTasks() as Map<any, any>;
    tasks.delete(taskName);
  }

  getList() {
    const tasks = cron.getTasks();
    return tasks.size;
  }
}
