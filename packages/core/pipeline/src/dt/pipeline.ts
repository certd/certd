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
  maxTaskCount?: number;
  style?: {
    width?: number;
    [key: string]: any;
  };
};

export type Trigger = {
  id: string;
  title: string;
  props: {
    cron: string;
  };
  type: string;
};

export type FileItem = {
  id: string;
  filename: string;
  path: string;
};
export type Runnable = {
  id: any;
  title: string;
  strategy?: RunnableStrategy;
  runnableType?: string; // pipeline, stage, task , step
  status?: HistoryResult;
  timeout?: number;
  default?: {
    [key: string]: any;
  };
  disabled?: boolean;
};

export type EmailOptions = {
  receivers: string[];
};
export type NotificationWhen = "error" | "success" | "turnToSuccess" | "start" | "skip";
export type NotificationType = "email" | "other";
export type Notification = {
  type: NotificationType;
  when: NotificationWhen[];
  options?: EmailOptions;
  notificationId: number;
  title: string;
  id: string;
  // 运行时状态（随运行历史保存，用于画布展示与日志查看）
  status?: HistoryResult;
};

/**
 * 后置任务触发条件（与通知 when 同语义，去掉 start：后置任务只在流水线结束后触发）
 */
export type AfterTaskWhen = "success" | "error" | "turnToSuccess";

/**
 * 流水线后置任务：
 * 流水线整体运行结束后触发，执行一个特殊的插件任务（接收流水线上下文与运行结果），
 * 失败时流水线整体视为执行失败（不影响任务本身状态，但通知会附加失败信息）。
 * 是否需要等待由插件自身控制（如吊销旧证书插件内置等待时长参数）。
 */
export type AfterTask = {
  id: string;
  title: string;
  // 触发条件：流水线最终结果为成功/失败/失败转成功
  when: AfterTaskWhen[];
  // 执行的插件类型（pluginRegistry 中注册的插件，需声明 supportAfterTask）
  type: string;
  // 插件输入参数（支持 output-selector 引用步骤输出）
  input: {
    [key: string]: any;
  };
  disabled?: boolean;
  // 运行时状态（随运行历史保存，用于画布展示成功/失败图标与日志查看）
  status?: HistoryResult;
};

export type Pipeline = Runnable & {
  version?: number;
  userId: any;
  projectId?: number;
  stages: Stage[];
  triggers: Trigger[];
  notifications?: Notification[];
  // 流水线运行结束后触发的后置任务（失败时流水线整体视为执行失败）
  afterTasks?: AfterTask[];
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

export type ResultError = {
  e: any;
  returnType: ResultType;
  runnable: Runnable;
};

export enum ResultType {
  start = "start",
  success = "success",
  error = "error",
  canceled = "canceled",
  skip = "skip",
  disabled = "disabled",
  none = "none",
}

export type HistoryResultGroup = {
  [key: string]: {
    runnable: Runnable;
    res: HistoryResult;
  };
};
export type HistoryResult = {
  inputHash?: string;
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
