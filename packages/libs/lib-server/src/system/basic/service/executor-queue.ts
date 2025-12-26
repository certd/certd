import { logger } from "@certd/basic";

export type TaskItem = {
  task: ()=>Promise<void>;
}

export class UserTaskQueue{
  userId: number;
  pendingQueue: TaskItem[] = [];
  runningQueue: TaskItem[] = [];
  getMaxRunningCount: ()=>number ;

  constructor(req: { userId: number ,getMaxRunningCount: ()=>number }) {
    this.userId = req.userId;
    this.getMaxRunningCount = req.getMaxRunningCount ;
  }

  addTask(task: TaskItem) {
    this.pendingQueue.push(task);
    this.runTask();
  }

  runTask() {
    logger.info(`[user_${this.userId}]当前运行队列：${this.runningQueue.length}, 等待队列：${this.pendingQueue.length}，最大运行队列：${this.getMaxRunningCount()}`);
    if (this.runningQueue.length >= this.getMaxRunningCount()) {
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
    logger.info(`[user_${this.userId}]执行任务，当前运行队列：${this.runningQueue.length}, 等待队列：${this.pendingQueue.length}`);
    call()
  }
}

export class ExecutorQueue{
  queues: Record<number, UserTaskQueue> = {};
  maxRunningCount: number = 8;


  setMaxRunningCount(count: number) {
    this.maxRunningCount = count;
  }

  getUserQueue(userId: number) {
    const userQueue = this.queues[userId];
    if (!userQueue) {
      this.queues[userId] = new UserTaskQueue({ userId, getMaxRunningCount: ()=>this.maxRunningCount });
    }
    return this.queues[userId];
  }

  addTask(userId: number, task: TaskItem) {
    const userQueue = this.getUserQueue(userId);
    userQueue.addTask(task);
  }
 
}

export const executorQueue = new ExecutorQueue();