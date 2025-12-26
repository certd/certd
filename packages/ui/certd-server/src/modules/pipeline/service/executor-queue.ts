import { logger } from "@certd/basic";

export type TaskItem = {
  task: ()=>Promise<void>;
}

export class ExecutorQueue{
  pendingQueue: TaskItem[] = [];
  runningQueue: TaskItem[] = [];
  maxRunningCount: number = 10;


  setMaxRunningCount(count: number) {
    this.maxRunningCount = count;
  }

  addTask(task: TaskItem) {
    this.pendingQueue.push(task);
    this.runTask();
  }

  runTask() {
    logger.info(`当前运行队列：${this.runningQueue.length}, 等待队列：${this.pendingQueue.length}`);
    if (this.runningQueue.length >= this.maxRunningCount) {
      logger.info(`当前运行队列已满，等待队列：${this.pendingQueue.length}`);
      return;
    }
    if (this.pendingQueue.length === 0) {
      return;
    }
    const task = this.pendingQueue.shift();
    if (!task) {
      return;
    }
    // 执行任务
    this.runningQueue.push(task);
    const call = async ()=>{
      try{
        await task.task();
      }finally{
        // 任务执行完成，从运行队列中移除
        const index = this.runningQueue.indexOf(task);
        if (index > -1) {
          this.runningQueue.splice(index, 1);
        }
        // 继续执行下一个任务
        this.runTask();
      }
    }
    call()
  }
}

export const executorQueue = new ExecutorQueue();