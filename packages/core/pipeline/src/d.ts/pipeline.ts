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

export type FileItem = {
  id: string;
  filename: string;
  path: string;
};
export type Runnable = {
  id: string;
  title: string;
  strategy?: RunnableStrategy;
  runnableType?: string; // pipeline, stage, task , step
  status?: HistoryResult;
  timeout?: number;
  default?: {
    [key: string]: any;
  };
  context?: Context;
};

export type EmailOptions = {
  receivers: string[];
};
export type NotificationWhen = "error" | "success" | "turnToSuccess" | "start";
export type NotificationType = "email" | "url";
export type Notification = {
  type: NotificationType;
  when: NotificationWhen[];
  options: EmailOptions;
};

export type Pipeline = Runnable & {
  version?: number;
  userId: any;
  stages: Stage[];
  triggers: Trigger[];
  notifications?: Notification[];
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
  start = "start",
  success = "success",
  error = "error",
  canceled = "canceled",
  skip = "skip",
  none = "none",
}

export type HistoryResultGroup = {
  [key: string]: {
    runnable: Runnable;
    res: HistoryResult;
  };
};
export type HistoryResult = {
  input: any;
  output: any;
  files?: FileItem[];
  /**
   * 任务状态
   */
  status: ResultType;
  startTime: number;
  endTime?: number;
  /**
   * 处理结果
   */
  result?: ResultType; //success, error,skip
  message?: string;
};

export type RunnableMap = {
  [id: string]: Runnable;
};
