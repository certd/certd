import { logger } from "@certd/basic"

export class BackTaskExecutor {
  tasks: Record<string, Record<string, BackTask>> = {}

  start(task: BackTask) {
    const type =  task.type || 'default'
    if (!this.tasks[type]) {
      this.tasks[type] = {}
    }
    const oldTask = this.tasks[type][task.key]
    if (oldTask && oldTask.status === "running") {
      throw new Error(`任务 ${task.title} 正在运行中`)
    }
    this.tasks[type][task.key] = task
    this.run(task);
  }

  get(type: string, key: string) {
    if (!this.tasks[type]) {
      this.tasks[type] = {}
    }
    return this.tasks[type][key]
  }

  removeIsEnd(type: string, key: string) {
    const task = this.tasks[type]?.[key]
    if (task && task.status !== "running") {
      this.clear(type, key);
    }
  }

  clear(type: string, key: string) {
    const task = this.tasks[type]?.[key]
    if (task) {
      task.clearTimeout();
      delete this.tasks[type][key]
    }
  }

  private async run(task: BackTask) {
    const type =  task.type || 'default'
    if (task.status === "running") {
      throw new Error(`任务 ${type}—${task.key} 正在运行中`)
    }
    task.startTime = Date.now();
    task.clearTimeout();
    try {
      task.status = "running";
      return await task.run(task);
    } catch (e) {
      logger.error(`任务 ${task.title}[${type}-${task.key}] 执行失败`, e.message);
      task.status = "failed";
      task.addError(e.message)
    } finally {
      task.endTime = Date.now();
      task.status = "done";
      task.timeoutId = setTimeout(() => {
        this.clear(type, task.key);
      }, 24 * 60 * 60 * 1000);
      delete task.run;
    }
  }



}
export class BackTask {
  type: string;
  key: string;
  title: string;
  total: number = 0;
  current: number = 0;
  skip: number = 0;
  startTime: number;
  endTime: number;
  status: string = "pending";
  errors?: string[] = [];
  timeoutId?: NodeJS.Timeout;



  run: (task: BackTask) => Promise<void>;

  constructor(opts: {
    type: string,
    key: string, title: string, run: (task: BackTask) => Promise<void>
  }) {
    const { key, title, run, type } = opts
    this.type = type
    this.key = key;
    this.title = title;
    Object.defineProperty(this, 'run', {
      value: run,
      writable: true,
      enumerable: false, // 设置为false使其不可遍历
      configurable: true
    });
  }

  clearTimeout() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  setTotal(total: number) {
    this.total = total;
  }
  incrementCurrent() {
    this.current++
  }

  addError(error: string) {
    logger.error(error)
    this.errors.push(error)
  }

  getSuccessCount() {
    return this.current - this.errors.length
  }

  getErrorCount() {
    return this.errors.length
  }

  getProgress() {
    return (this.current / this.total * 1.0).toFixed(2)
  }

  getSkipCount() {
    return this.skip
  }

  incrementSkip() {
    this.skip++
  }
}

export const taskExecutor = new BackTaskExecutor();