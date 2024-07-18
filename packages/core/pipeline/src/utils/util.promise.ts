import { logger } from "./util.log.js";

export function TimeoutPromise(callback: () => Promise<void>, ms = 30 * 1000) {
  let timeout: any;
  return Promise.race([
    callback(),
    new Promise((resolve, reject) => {
      timeout = setTimeout(() => {
        reject(new Error(`Task timeout in ${ms} ms`));
      }, ms);
    }),
  ]).finally(() => {
    clearTimeout(timeout);
  });
}

export function safePromise<T>(callback: (resolve: (ret: T) => void, reject: (ret: any) => void) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      callback(resolve, reject);
    } catch (e) {
      logger.error(e);
      reject(e);
    }
  });
}
