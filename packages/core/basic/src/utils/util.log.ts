import log4js, { CallStack, Level } from "log4js";

let logFilePath = "./logs/app.log";
export function resetLogConfigure() {
  // @ts-ignore
  log4js.configure({
    appenders: {
      std: { type: "stdout" },
      file: {
        type: "dateFile",
        filename: logFilePath,
        keepFileExt: true,
        compress: true,
        numBackups: 3,
      },
    },
    categories: { default: { appenders: ["std", "file"], level: "info" }, pipeline: { appenders: ["std", "file"], level: "info" } },
  });
}
resetLogConfigure();
export const logger: ILogger = log4js.getLogger("default") as any;

export function resetLogFilePath(filePath: string) {
  logFilePath = filePath;
  resetLogConfigure();
}
export function buildLogger(write: (text: string) => void) {
  return new PipelineLogger("pipeline", write);
}

export type ILogger = {
  readonly category: string;
  level: Level | string;
  log(level: Level | string, ...args: any[]): void;

  isLevelEnabled(level?: string): boolean;

  isTraceEnabled(): boolean;
  isDebugEnabled(): boolean;
  isInfoEnabled(): boolean;
  isWarnEnabled(): boolean;
  isErrorEnabled(): boolean;
  isFatalEnabled(): boolean;

  _log(level: Level, data: any): void;

  addContext(key: string, value: any): void;

  removeContext(key: string): void;

  clearContext(): void;

  /**
   * Replace the basic parse function with a new custom one
   * - Note that linesToSkip will be based on the origin of the Error object in addition to the callStackLinesToSkip (at least 1)
   * @param parseFunction the new parseFunction. Use `undefined` to reset to the base implementation
   */
  setParseCallStackFunction(parseFunction: (error: Error, linesToSkip: number) => CallStack | undefined): void;

  /**
   * Adjust the value of linesToSkip when the parseFunction is called.
   *
   * Cannot be less than 0.
   */
  callStackLinesToSkip: number;

  trace(message: any, ...args: any[]): void;

  debug(message: any, ...args: any[]): void;

  info(message: any, ...args: any[]): void;

  warn(message: any, ...args: any[]): void;

  error(message: any, ...args: any[]): void;

  fatal(message: any, ...args: any[]): void;

  mark(message: any, ...args: any[]): void;

  addSecret(secret: string): void;
};

const locale = Intl.DateTimeFormat().resolvedOptions().locale;
const formatter = new Intl.DateTimeFormat(locale, {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});
function formatDateIntl(date = new Date()) {
  const milliseconds = date.getMilliseconds(); // 获取毫秒
  const formattedMilliseconds = milliseconds.toString().padStart(3, "0");
  return formatter.format(date) + "." + formattedMilliseconds;
}

// @ts-ignore
export class PipelineLogger implements ILogger {
  callStackLinesToSkip: number = 3;
  readonly category: string = "pipeline";
  level: Level | string = "info";
  _secrets: string[] = [];
  logger: ILogger;
  customWriter!: (text: string) => void;

  constructor(name: string, write: (text: string) => void) {
    this.customWriter = write;
    //@ts-ignore
    this.logger = log4js.getLogger(name);
  }

  addSecret(secret: string) {
    if (!secret) {
      return;
    }
    this._secrets.push(secret);
  }

  _doLog(level: string, ...args: any[]) {
    let text = args.join(" ");
    if (this.customWriter) {
      for (const item of this._secrets) {
        if (item == null) {
          continue;
        }
        if (item.includes(text)) {
          //整个包含
          text = "*".repeat(text.length);
          continue;
        }
        if (text.includes(item)) {
          //换成同长度的*号， item可能有多行
          text = text.replaceAll(item, "*".repeat(item.length));
        }
      }
      text = `[${formatDateIntl()}] [${level.toUpperCase()}] - ${text} \n`;
      this.customWriter(text);
    }
    // @ts-ignore
    this.logger[level](...args);
  }

  _log(level: Level, data: any): void {}

  addContext(key: string, value: any): void {}

  clearContext(): void {}

  debug(message: any, ...args: any[]): void {
    if (this.isDebugEnabled()) {
      this._doLog("debug", message, ...args);
    }
  }

  error(message: any, ...args: any[]): void {
    if (this.isErrorEnabled()) {
      this._doLog("error", message, ...args);
    }
  }

  fatal(message: any, ...args: any[]): void {
    if (this.isFatalEnabled()) {
      this._doLog("fatal", message, ...args);
    }
  }

  info(message: any, ...args: any[]): void {
    if (this.isInfoEnabled()) {
      this._doLog("info", message, ...args);
    }
  }

  trace(message: any, ...args: any[]): void {
    if (this.isTraceEnabled()) {
      this._doLog("trace", message, ...args);
    }
  }

  warn(message: any, ...args: any[]): void {
    if (this.isWarnEnabled()) {
      this._doLog("warn", message, ...args);
    }
  }

  isDebugEnabled(): boolean {
    return logger.isDebugEnabled();
  }

  isErrorEnabled(): boolean {
    return logger.isErrorEnabled();
  }

  isFatalEnabled(): boolean {
    return logger.isFatalEnabled();
  }

  isInfoEnabled(): boolean {
    return logger.isInfoEnabled();
  }

  isLevelEnabled(level?: string): boolean {
    return logger.isLevelEnabled();
  }

  isTraceEnabled(): boolean {
    return logger.isTraceEnabled();
  }

  isWarnEnabled(): boolean {
    return logger.isWarnEnabled();
  }

  log(level: Level | string, ...args: any[]): void {}

  mark(message: any, ...args: any[]): void {}

  removeContext(key: string): void {}

  setParseCallStackFunction(parseFunction: (error: Error, linesToSkip: number) => CallStack | undefined): void {}
}
