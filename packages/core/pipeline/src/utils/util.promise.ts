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
