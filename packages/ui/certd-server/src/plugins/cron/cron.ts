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
    this.logger.info('当前定时任务数量：', this.getListSize());
  }

  remove(taskName: string) {
    this.logger.info(`[cron] remove : [${taskName}]`);
    const tasks = cron.getTasks() as Map<any, any>;
    const node = tasks.get(taskName);
    if (node) {
      node.stop();
      tasks.delete(taskName);
    }
  }

  getListSize() {
    const tasks = cron.getTasks();
    return tasks.size;
  }
}
