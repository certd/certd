import { logger } from "@certd/basic"

export class BackTaskExecutor{
  tasks :Record<string,Record<string,BackTask>> = {}

  add(type:string,task: BackTask){
    if (!this.tasks[type]) {
      this.tasks[type] = {}
    }
    this.tasks[type][task.key] = task
  }

  get(type: string,key: string){
    return this.tasks[type][key]
  }

  removeIsEnd(type: string,key: string){
    const task = this.tasks[type]?.[key]
    if (task && task.status !== "running") {
      this.clear(type,key);
    }
  }

  clear(type: string,key: string){
    const task = this.tasks[type]?.[key]
    if (task) {
      task.clearTimeout();
      delete this.tasks[type][key]
    }
  }

  

  async run(type:string,key: string){
    const task = this.tasks[type]?.[key]
    if (!task) {
      throw new Error(`任务 ${key} 不存在`)
    }
    task.startTime = Date.now();
    task.clearTimeout();
    try{
      task.status = "running";
      return await task.run();
    }catch(e){
      logger.error(`任务 ${task.title}[${task.key}] 执行失败`, e.message);
      task.status = "failed";
      task.error = e.message;
    }finally{
      task.endTime = Date.now();
      task.status = "done";
      task.timeoutId = setTimeout(() => {
        this.clear(type,task.key);
      }, 60*60*1000);
    }
  }
}
export class BackTask{
  key:string;
  title: string;
  total: number = 0;
  current: number = 0;
  startTime: number;
  endTime: number;
  status: string = "pending";
  error?: string;
  timeoutId?: NodeJS.Timeout;


  run: () => Promise<void>;

  constructor(key:string,title: string,run: () => Promise<void>){
    this.key = key;
    this.title = title;
    Object.defineProperty(this, 'run', {
      value: run,
      writable: true,
      enumerable: false, // 设置为false使其不可遍历
      configurable: true
    });
  }

  clearTimeout(){
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}