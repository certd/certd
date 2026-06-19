/**
 * 运行时动态导入函数类型
 */
export type ImportRuntime = (specifier: string, logger?: ILogger) => Promise<any>;

/**
 * 日志接口
 */
export type ILogger = {
  info: (message: string) => void;
};

/**
 * 运行时依赖服务参数
 */
export type EnsureRuntimeDepsOptions = {
  pluginKeys: string | string[];
  logger?: ILogger;
};

/**
 * 运行时依赖服务接口
 */
export interface IRuntimeDepsService {
  ensureRuntimeDependencies(options: EnsureRuntimeDepsOptions): Promise<any>;
  importRuntime: ImportRuntime;
}
