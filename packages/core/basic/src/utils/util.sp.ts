//转换为import
import childProcess from "child_process";
import { safePromise } from "./util.promise.js";
import { ILogger, logger } from "./util.log.js";
//@ts-ignore
import iconv from "iconv-lite";
export type SpawnOption = {
  cmd: string;
  args?: string[];
  onStdout?: (data: string) => void;
  onStderr?: (data: string) => void;
  env?: any;
  logger?: ILogger;
  options?: any;
};

function isWindows() {
  // @ts-ignore
  return process.platform === "win32";
}
function convert(buffer: any) {
  if (isWindows()) {
    const decoded = iconv.decode(buffer, "GBK");
    // 检查是否有有效字符
    return decoded && decoded.trim().length > 0 ? decoded : buffer.toString();
  } else {
    return buffer;
  }
}

// function convert(buffer: any) {
//   return buffer;
// }

async function spawn(opts: SpawnOption): Promise<string> {
  const args = opts.args || [];
  const log = opts.logger || logger;
  log.info(`执行本地程序: ${opts.cmd}`);
  let stdout = "";
  let stderr = "";
  return safePromise((resolve, reject) => {
    const ls = childProcess.spawn(opts.cmd, args, {
      env: {
        //@ts-ignore
        ...process.env,
        ...opts.env,
      },
      ...opts.options,
      shell: false,
    });
    ls.stdout.on("data", (data: string) => {
      data = convert(data);
      opts.onStdout?.(String(data));
      log.info(`stdout: ${data}`);
      stdout += data;
    });

    ls.stderr.on("data", (data: string) => {
      data = convert(data);
      opts.onStderr?.(String(data));
      log.warn(`stderr: ${data}`);
      stderr += data;
    });
    ls.on("error", (error: any) => {
      log.error(`child process error: ${error}`);
      //@ts-ignore
      error.stderr = stderr;
      //@ts-ignore
      error.stdout = stdout;
      reject(error);
    });

    ls.on("close", (code: number) => {
      if (code !== 0) {
        log.error(`child process exited with code ${code}`);
        const e = new Error(stderr || "return " + code);
        //@ts-ignore
        e.stderr = stderr;
        //@ts-ignore
        e.stdout = stdout;
        reject(e);
      } else {
        resolve(stdout);
      }
    });
  });
}

export const sp = {
  spawn,
};
