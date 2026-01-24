import { logger } from "@certd/basic"

export class BackTaskExecutor {
  tasks: Record<string, Record<string, BackTask>> = {}

  start(task: BackTask) {
    const type =  task.type || 'default'
    if (!this.tasks[type]) {
      this.tasks[type] = {}
    }
    const oldTask = this.tasks[type][task.key]
    if (oldTask ){
      if (oldTask.status === "running") {
        throw new Error(`任务 ${task.title} 正在运行中`)
      }
      this.clear(type, task.key);
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
      task.setTimeoutId(setTimeout(() => {
        this.clear(type, task.key);
      }, 24 * 60 * 60 * 1000));
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
  private _timeoutId?: NodeJS.Timeout;



  private _run: (task: BackTask) => Promise<void>;

  constructor(opts: {
    type: string,
    key: string, title: string, run: (task: BackTask) => Promise<void>
  }) {
    const { key, title, run, type } = opts
    this.type = type
    this.key = key;
    this.title = title;
    this._run = run;

    Object.defineProperty(this, '_run', {
      enumerable: false,
      value: this._run
    })
    Object.defineProperty(this, '_timeoutId', {
      enumerable: false,
      value: null
    })

    Object.defineProperty(this, 'progress', {
      get: ()=> {
        return this.getProgress()
      },
      enumerable: true,  // 关键：设置为可枚举
      configurable: true
    });
    Object.defineProperty(this, 'successCount', {
      get: ()=> {
        return this.getSuccessCount()
      },
      enumerable: true,  // 关键：设置为可枚举
      configurable: true
    })
    Object.defineProperty(this, 'errorCount', {
      get: ()=> {
        return this.getErrorCount()
      },
      enumerable: true,  // 关键：设置为可枚举
      configurable: true
    })
    Object.defineProperty(this, 'skipCount', {
      get: ()=> {
        return this.getSkipCount()
      },
      enumerable: true,  // 关键：设置为可枚举
      configurable: true
    })
  }

  async run(task: BackTask) {
    return await this._run(task);
  }

  clearTimeout() {
    if (this._timeoutId) {
      clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }
  }


  setTimeoutId(timeoutId: NodeJS.Timeout) {
    this.clearTimeout();
    this._timeoutId = timeoutId;
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

  getErrorCount() {
    return this.errors.length
  }

  getSkipCount() {
    return this.skip
  }

  getSuccessCount() {
    return this.current - this.errors.length
  }

  getProgress() {
    return (this.current * 1.0 / this.total  * 100.0);
  }


  incrementSkip() {
    this.skip++
  }
}

export const taskExecutor = new BackTaskExecutor();