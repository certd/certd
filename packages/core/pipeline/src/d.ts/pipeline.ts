export enum RunStrategy {
  AlwaysRun,
  SkipWhenSucceed,
}

export enum ConcurrencyStrategy {
  Serial,
  Parallel,
}

export enum NextStrategy {
  AllSuccess,
  OneSuccess,
}

export enum HandlerType {
  //清空后续任务的状态
  ClearFollowStatus,
  SendEmail,
}

export type EventHandler = {
  type: HandlerType;
  params: {
    [key: string]: any;
  };
};

export type RunnableStrategy = {
  runStrategy?: RunStrategy;
  onSuccess?: EventHandler[];
  onError?: EventHandler[];
};

export type Step = Runnable & {
  type: string; //插件类型
  input: {
    [key: string]: any;
  };
};
export type Task = Runnable & {
  steps: Step[];
};

export type Stage = Runnable & {
  tasks: Task[];
  concurrency: ConcurrencyStrategy;
  next: NextStrategy;
};

export type Trigger = {
  id: string;
  title: string;
  cron: string;
  type: string;
};

export type Runnable = {
  id: string;
  title: string;
  strategy?: RunnableStrategy;
  runnableType?: string; // pipeline, stage, task , step
  status?: HistoryResult;
  default?: {
    [key: string]: any;
  };
};

export type Pipeline = Runnable & {
  version?: number;
  userId: any;
  stages: Stage[];
  triggers: Trigger[];
};

export type Context = {
  [key: string]: any;
};

export type Log = {
  title: string;
  time: number;
  level: string;
  text: string;
};

export enum ResultType {
  success,
  error,
  skip,
}

export type HistoryResultGroup = {
  [key: string]: {
    runnable: Runnable;
    res: HistoryResult;
  };
};
export type HistoryResult = {
  /**
   * 任务状态
   */
  status: string;
  startTime: number;
  endTime?: number;
  /**
   * 处理结果
   */
  result?: string; //success, error,skip
  message?: string;
};
