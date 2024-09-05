//转换为import
import childProcess from "child_process";
import { safePromise } from "./util.promise.js";
import { ILogger, logger } from "./util.log.js";

export type ExecOption = {
  cmd: string | string[];
  env: any;
  logger?: ILogger;
  options?: any;
};

async function exec(opts: ExecOption): Promise<string> {
  let cmd = "";
  const log = opts.logger || logger;
  if (opts.cmd instanceof Array) {
    for (const item of opts.cmd) {
      if (cmd) {
        cmd += " && " + item;
      } else {
        cmd = item;
      }
    }
  }
  log.info(`执行命令: ${cmd}`);
  return safePromise((resolve, reject) => {
    childProcess.exec(
      cmd,
      {
        env: {
          ...process.env,
          ...opts.env,
        },
        ...opts.options,
      },
      (error, stdout, stderr) => {
        if (error) {
          log.error(`exec error: ${error}`);
          reject(error);
        } else {
          const res = stdout.toString("utf-8");
          log.info(`stdout: ${res}`);
          resolve(res);
        }
      }
    );
  });
}

export type SpawnOption = {
  cmd: string | string[];
  onStdout?: (data: string) => void;
  onStderr?: (data: string) => void;
  env?: any;
  logger?: ILogger;
  options?: any;
};
async function spawn(opts: SpawnOption): Promise<string> {
  let cmd = "";
  const log = opts.logger || logger;
  if (opts.cmd instanceof Array) {
    for (const item of opts.cmd) {
      if (cmd) {
        cmd += " && " + item;
      } else {
        cmd = item;
      }
    }
  }else{
    cmd = opts.cmd
  }
  log.info(`执行命令: ${cmd}`);
  let stdout = "";
  let stderr = "";
  return safePromise((resolve, reject) => {
    const ls = childProcess.spawn(cmd, {
      shell: true,
      env: {
        ...process.env,
        ...opts.env,
      },
      ...opts.options,
    });
    ls.stdout.on("data", (data) => {
      log.info(`stdout: ${data}`);
      stdout += data;
    });

    ls.stderr.on("data", (data) => {
      log.error(`stderr: ${data}`);
      stderr += data;
    });
    ls.on("error", (error) => {
      log.error(`child process error: ${error}`);
      reject(error);
    });

    ls.on("close", (code: number) => {
      if (code !== 0) {
        log.error(`child process exited with code ${code}`);
        reject(new Error(stderr));
      } else {
        resolve(stdout);
      }
    });
  });
}

export const sp = {
  spawn,
  exec,
};
