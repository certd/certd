import log4js, { LoggingEvent, Logger } from "log4js";

const OutputAppender = {
  configure: (config: any, layouts: any, findAppender: any, levels: any) => {
    let layout = layouts.basicLayout;
    if (config.layout) {
      layout = layouts.layout(config.layout.type, config.layout);
    }
    function customAppender(layout: any, timezoneOffset: any) {
      return (loggingEvent: LoggingEvent) => {
        if (loggingEvent.context.outputHandler?.write) {
          const text = `${layout(loggingEvent, timezoneOffset)}\n`;
          loggingEvent.context.outputHandler.write(text);
        }
      };
    }
    return customAppender(layout, config.timezoneOffset);
  },
};

// @ts-ignore
log4js.configure({
  appenders: { std: { type: "stdout" }, output: { type: OutputAppender } },
  categories: { default: { appenders: ["std"], level: "info" }, pipeline: { appenders: ["std", "output"], level: "info" } },
});
export const logger = log4js.getLogger("default");

export function buildLogger(write: (text: string) => void) {
  const logger = log4js.getLogger("pipeline");
  logger.addContext("outputHandler", {
    write,
  });
  return logger;
}
export type ILogger = Logger;
