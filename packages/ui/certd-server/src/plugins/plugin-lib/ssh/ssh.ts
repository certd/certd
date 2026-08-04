// @ts-ignore
import path from "path";
import { isArray } from "lodash-es";
import { ILogger, safePromise } from "@certd/basic";
import { SshAccess } from "./ssh-access.js";

import fs from "fs";
import { SocksProxyType } from "socks/typings/common/constants.js";

export type TransportItem = { localPath: string; remotePath: string };
export interface SocksProxy {
  ipaddress?: string;
  host?: string;
  port: number;
  type: any;
  userId?: string;
  password?: string;
  custom_auth_method?: number;
  custom_auth_request_handler?: () => Promise<Buffer>;
  custom_auth_response_size?: number;
  custom_auth_response_handler?: (data: Buffer) => Promise<boolean>;
}
export type SshConnectConfig = {
  sock?: any;
};

export class AsyncSsh2Client {
  conn: any;
  logger: ILogger;
  connConf: SshAccess & SshConnectConfig;
  windows = false;
  encoding: string;
  constructor(connConf: SshAccess, logger: ILogger) {
    this.connConf = connConf;
    this.logger = logger;
    this.windows = connConf.windows || false;
    this.encoding = connConf.encoding;
  }

  convert(iconv: any, buffer: Buffer) {
    if (this.encoding) {
      return iconv.decode(buffer, this.encoding);
    }
    return buffer.toString().replaceAll("\r\n", "\n");
  }

  async connect() {
    this.logger.info(`Connecting，${this.connConf.host}:${this.connConf.port}`);
    if (this.connConf.socksProxy) {
      this.logger.info(`Using proxy ${this.connConf.socksProxy}`);
      if (typeof this.connConf.port === "string") {
        this.connConf.port = parseInt(this.connConf.port);
      }

      const { SocksClient } = await import("socks");

      const proxyOption = this.parseSocksProxyFromUri(this.connConf.socksProxy);
      const info = await SocksClient.createConnection({
        proxy: proxyOption,
        command: "connect",
        destination: {
          host: this.connConf.host,
          port: this.connConf.port,
        },
      });
      this.logger.info("Proxy connected");
      this.connConf.sock = info.socket;
    }

    const ssh2 = await import("ssh2");
    const ssh2Constants = await import("ssh2/lib/protocol/constants.js");
    const { SUPPORTED_KEX, SUPPORTED_SERVER_HOST_KEY, SUPPORTED_CIPHER, SUPPORTED_MAC } = ssh2Constants.default;
    return safePromise((resolve, reject) => {
      try {
        const conn = new ssh2.default.Client();
        conn
          .on("error", (err: any) => {
            this.logger.error("Connection failed", err);
            reject(err);
          })
          .on("ready", () => {
            this.logger.info("Connected");
            this.conn = conn;
            resolve(this.conn);
          })
          .on("keyboard-interactive", (name, descr, lang, prompts, finish) => {
            // For illustration purposes only! It's not safe to do this!
            // You can read it from process.stdin or whatever else...
            const password = this.connConf.password;
            return finish([password]);

            // And remember, server may trigger this event multiple times
            // and for different purposes (not only auth)
          })
          .connect({
            ...this.connConf,
            tryKeyboard: true,
            algorithms: {
              serverHostKey: SUPPORTED_SERVER_HOST_KEY,
              cipher: SUPPORTED_CIPHER,
              hmac: SUPPORTED_MAC,
              kex: SUPPORTED_KEX,
            },
          });
      } catch (e) {
        reject(e);
      }
    });
  }
  async getSftp() {
    return safePromise((resolve, reject) => {
      this.logger.info("Get SFTP");
      this.conn.sftp((err: any, sftp: any) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(sftp);
      });
    });
  }

  async fastPut(options: { sftp: any; localPath: string; remotePath: string; opts?: { mode?: string } }) {
    const { sftp, localPath, remotePath, opts } = options;
    return safePromise((resolve, reject) => {
      this.logger.info(`Starting upload：${localPath} => ${remotePath}`);
      sftp.fastPut(localPath, remotePath, { ...(opts ?? {}) }, (err: Error) => {
        if (err) {
          reject(err);
          this.logger.error("Check that the path includes a file name, is not a directory, does not contain special characters such as * or ?, and has write permission");
          return;
        }
        this.logger.info(`File uploaded successfully：${localPath} => ${remotePath}`);
        resolve({});
      });
    });
  }

  async listDir(options: { sftp: any; remotePath: string }) {
    const { sftp, remotePath } = options;
    return safePromise((resolve, reject) => {
      this.logger.info(`listDir：${remotePath}`);
      sftp.readdir(remotePath, (err: Error, list: any) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(list);
      });
    });
  }

  async unlink(options: { sftp: any; remotePath: string }) {
    const { sftp, remotePath } = options;
    return safePromise((resolve, reject) => {
      this.logger.info(`Deleting remote file：${remotePath}`);
      sftp.unlink(remotePath, (err: Error) => {
        if (err) {
          reject(err);
          return;
        }
        this.logger.info(`File deleted successfully：${remotePath}`);
        resolve({});
      });
    });
  }

  /**
   *
   * @param script
   * @param opts {withStdErr 返回{stdOut,stdErr}}
   */
  async exec(
    script: string,
    opts: {
      throwOnStdErr?: boolean;
      withStdErr?: boolean;
      env?: any;
    } = {}
  ): Promise<string> {
    if (!script) {
      this.logger.info("script is empty, canceling execution");
      return;
    }
    let iconv: any = await import("iconv-lite");
    iconv = iconv.default;
    // if (this.connConf.windows) {
    //   script += "\r\nexit\r\n";
    //   //保证windows下正常退出
    // }

    if (script.includes(" -i ")) {
      this.logger.warn("Interactive commands are not supported; do not use the -i option");
    }

    return safePromise((resolve, reject) => {
      this.logger.info(`Executing command：[${this.connConf.host}][exec]: \n` + script);
      // pty 伪终端，window下的输出会带上conhost.exe之类的多余的字符串，影响返回结果判断
      // linux下 当使用keyboard-interactive 登录时，需要pty
      const pty = this.connConf.pty; //linux下开启伪终端，windows下不开启
      this.conn.exec(script, { pty, env: opts.env }, (err: Error, stream: any) => {
        if (err) {
          reject(err);
          return;
        }
        let data = "";
        let stdErr = "";
        let hasErrorLog = false;
        stream
          .on("close", (code: any, signal: any) => {
            this.logger.info(`[${this.connConf.host}][close]:code=${code}`);
            /**
             * ]pipeline Executing command:[10.123.0.2][exec]:cd /d D:\nginx-1.27.5 && D:\nginx-1.27.5\nginx.exe -t && D:\nginx-1.27.5\nginx.exe -s reload
             * [2025-07-09T10:24:11.219] [ERROR]pipeline - [10. 123.0. 2][error]: nginx: the configuration file D: \nginx-1.27. 5/conf/nginx. conf syntax is ok
             * [2025-07-09T10:24:11.231] [ERROR][10. 123. 0. 2] [error]: nginx: configuration file D: \nginx-1.27.5/conf/nginx.conf test is successful
             * pipeline-
             * [2025-07-09T10:24:11.473] [INFO]pipeline -[10.123.0.2][close]:code:0
             * [2025-07-09T10:24:11.473][ERRoR] pipeline- [step][主机一执行远程主机脚本命令]<id:53hyarN3yvmbijNuMiNAt>: [Eror: nginx: the configuration fileD:\nginx-1.27.5/conf/nginx.conf syntax is ok
              //需要忽略windows的错误
             */
            // if (opts.throwOnStdErr == null && this.windows) {
            //   opts.throwOnStdErr = true;
            // }
            if (opts.throwOnStdErr && hasErrorLog) {
              reject(new Error(data));
            }

            if (code === 0) {
              if (opts.withStdErr === true) {
                //@ts-ignore
                resolve({
                  stdErr,
                  stdOut: data,
                });
              } else {
                resolve(data);
              }
            } else {
              reject(new Error(data));
            }
          })
          .on("data", (ret: Buffer) => {
            const out = this.convert(iconv, ret);
            data += out;
            this.logger.info(`[${this.connConf.host}][info]: ` + out.trimEnd());
          })
          .on("error", (err: any) => {
            reject(err);
            this.logger.error(err);
          })
          .stderr.on("data", (ret: Buffer) => {
            const err = this.convert(iconv, ret);
            stdErr += err;
            hasErrorLog = true;
            if (err.includes("sudo: a password is required")) {
              this.logger.warn("Configure passwordless sudo or the command cannot execute");
            }
            this.logger.error(`[${this.connConf.host}][error]: ` + err.trimEnd());
          });
      });
    });
  }

  async shell(script: string | string[]): Promise<string> {
    const stripAnsiModule = await import("strip-ansi");
    const stripAnsi = stripAnsiModule.default;
    return safePromise<any>((resolve, reject) => {
      this.logger.info(`Executing shell script：[${this.connConf.host}][shell]: ` + script);
      this.conn.shell((err: Error, stream: any) => {
        if (err) {
          reject(err);
          return;
        }
        let output = "";
        function ansiHandle(data: string) {
          data = data.replace(/\[[0-9]+;1H/g, "");
          data = stripAnsi(data);
          return data.replaceAll("\r\n", "\n");
        }
        stream
          .on("close", (code: any) => {
            this.logger.info("Stream :: close,code = " + code);
            resolve(output);
          })
          .on("data", (ret: Buffer) => {
            const data = ansiHandle(ret.toString());
            this.logger.info(data);
            output += data;
          })
          .on("error", (err: any) => {
            reject(err);
            this.logger.error(err);
          })
          .stderr.on("data", (ret: Buffer) => {
            const data = ansiHandle(ret.toString());
            output += data;
            this.logger.error(`[${this.connConf.host}][error]: ` + data);
          });
        //保证windows下正常退出
        const exit = "\r\nexit\r\n";
        stream.end(script + exit);
      });
    });
  }
  end() {
    if (this.conn) {
      this.conn.end();
      this.conn.destroy();
      this.conn = null;
    }
  }

  private parseSocksProxyFromUri(socksProxyUri: string): SocksProxy {
    const url = new URL(socksProxyUri);
    let type: SocksProxyType = 5;
    if (url.protocol.startsWith("socks4")) {
      type = 4;
    }
    const proxy: SocksProxy = {
      host: url.hostname,
      port: parseInt(url.port),
      type,
    };
    if (url.username) {
      proxy.userId = url.username;
    }
    if (url.password) {
      proxy.password = url.password;
    }
    return proxy;
  }

  async download(param: { remotePath: string; savePath: string; sftp: any }) {
    return safePromise((resolve, reject) => {
      const { remotePath, savePath, sftp } = param;
      sftp.fastGet(
        remotePath,
        savePath,
        {
          step: (transferred: any, chunk: any, total: any) => {
            this.logger.info(`${transferred} / ${total}`);
          },
        },
        (err: any) => {
          if (err) {
            reject(err);
          } else {
            resolve({});
          }
        }
      );
    });
  }
}

export class SshClient {
  logger: ILogger;
  /**
   *
   * @param connectConf
    {
          host: '192.168.100.100',
          port: 22,
          username: 'frylock',
          password: 'nodejsrules'
         }
   * @param options
   */
  async uploadFiles(options: { connectConf: SshAccess; transports: TransportItem[]; mkdirs: boolean; opts?: { mode?: string }; uploadType?: string }) {
    const { connectConf, transports, mkdirs, opts } = options;
    await this._call({
      connectConf,
      callable: async (conn: AsyncSsh2Client) => {
        this.logger.info("Starting upload");
        if (mkdirs !== false) {
          this.logger.info("Initializing parent directory");
          for (const transport of transports) {
            const filePath = path.dirname(transport.remotePath);
            let mkdirCmd = `mkdir -p ${filePath} `;
            if (conn.windows) {
              if (filePath.indexOf("/") > -1) {
                this.logger.info("--------------------------");
                this.logger.info("Note: on Windows, file path separators should be \\\\ rather than /");
                this.logger.info("--------------------------");
              }
              const isCmd = await this.isCmd(conn);
              if (!isCmd) {
                mkdirCmd = `New-Item -ItemType Directory -Path "${filePath}" -Force`;
              } else {
                mkdirCmd = `if not exist "${filePath}" mkdir "${filePath}"`;
              }
            }
            await conn.exec(mkdirCmd);
          }
        }

        if (options.uploadType === "scp") {
          //scp
          for (const transport of transports) {
            await this.scpUpload({ conn, ...transport, opts });
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } else {
          const sftp = await conn.getSftp();
          for (const transport of transports) {
            await conn.fastPut({ sftp, ...transport, opts });
          }
        }

        this.logger.info("All files uploaded successfully");
      },
    });
  }
  constructor(logger: ILogger) {
    this.logger = logger;
  }

  async scpUpload(options: { conn: any; localPath: string; remotePath: string; opts?: { mode?: string } }) {
    const { conn, localPath, remotePath } = options;
    return safePromise((resolve, reject) => {
      // 关键步骤：构造 SCP 命令
      this.logger.info(`Starting upload：${localPath} => ${remotePath}`);
      conn.conn.exec(
        `scp -t ${remotePath}`, // -t 表示目标模式
        (err, stream) => {
          if (err) {
            return reject(err);
          }
          try {
            // 准备 SCP 协议头
            const fileStats = fs.statSync(localPath);
            const fileName = path.basename(localPath);

            // SCP 协议格式：C[权限] [文件大小] [文件名]\n
            stream.write(`C0644 ${fileStats.size} ${fileName}\n`);

            // 通过管道传输文件
            fs.createReadStream(localPath)
              .on("error", e => {
                this.logger.info("read stream error", e);
                reject(e);
              })
              .pipe(stream)
              .on("finish", async () => {
                this.logger.info(`Upload completed：${localPath} => ${remotePath}`);
                resolve(true);
              })
              .on("error", reject);
          } catch (e) {
            reject(e);
          }
        }
      );
    });
  }

  async removeFiles(opts: { connectConf: SshAccess; files: string[] }) {
    const { connectConf, files } = opts;
    await this._call({
      connectConf,
      callable: async (conn: AsyncSsh2Client) => {
        const sftp = await conn.getSftp();
        this.logger.info("Starting delete");
        for (const file of files) {
          await conn.unlink({
            sftp,
            remotePath: file,
          });
        }
        this.logger.info("All files deleted successfully");
      },
    });
  }

  async isCmd(conn: AsyncSsh2Client) {
    const spec = await conn.exec("echo %COMSPEC% ");
    const ret = spec.toString().trim();
    if (ret.includes("%COMSPEC%") && !ret.includes("echo %COMSPEC%")) {
      return false;
    } else {
      return true;
    }
  }

  async getIsCmd(options: { connectConf: SshAccess }) {
    const { connectConf } = options;
    return await this._call<boolean>({
      connectConf,
      callable: async (conn: AsyncSsh2Client) => {
        return await this.isCmd(conn);
      },
    });
  }

  /**
   *
   * Set-ItemProperty -Path "HKLM:\SOFTWARE\OpenSSH" -Name DefaultShell -Value "C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe"
   * Start-Service sshd
   *
   * Set-ItemProperty -Path "HKLM:\SOFTWARE\OpenSSH" -Name DefaultShell -Value "C:\Windows\System32\cmd.exe"
   * @param options
   */
  async exec(options: { connectConf: SshAccess; script: string | Array<string>; env?: any; throwOnStdErr?: boolean; stopOnError?: boolean }): Promise<string> {
    let { script } = options;
    const { connectConf, throwOnStdErr } = options;

    // this.logger.info('命令：', script);
    return await this._call({
      connectConf,
      callable: async (conn: AsyncSsh2Client) => {
        let isWinCmd = false;
        const isLinux = !connectConf.windows;
        const envScripts = [];
        if (connectConf.windows) {
          isWinCmd = await this.isCmd(conn);
        }

        if (options.env) {
          for (const key in options.env) {
            if (isLinux) {
              envScripts.push(`export ${key}=${options.env[key]}`);
            } else if (isWinCmd) {
              //win cmd
              envScripts.push(`set ${key}=${options.env[key]}`);
            } else {
              //powershell
              envScripts.push(`$env:${key}="${options.env[key]}"`);
            }
          }
        }

        if (isWinCmd) {
          if (typeof script === "string") {
            script = script.split("\n");
          }
          //组合成&&的形式
          script = envScripts.concat(script);
          script = script as Array<string>;
          script = script.join(" && ");
        } else {
          const newLine = isLinux ? "\n" : "\r\n";
          if (isArray(script)) {
            script = script as Array<string>;
            script = script.join(newLine);
          }
          if (envScripts.length > 0) {
            script = envScripts.join(newLine) + newLine + script;
          }
        }

        if (isLinux) {
          if (options.connectConf.scriptType == "bash") {
            script = "#!/usr/bin/env bash \n" + script;
          } else if (options.connectConf.scriptType == "sh") {
            script = "#!/bin/sh\n" + script;
          }

          if (options.connectConf.scriptType != "fish" && options.stopOnError !== false) {
            script = "set -e\n" + script;
          }
        }

        return await conn.exec(script as string, { throwOnStdErr });
      },
    });
  }

  async shell(options: { connectConf: SshAccess; script: string | Array<string> }): Promise<string> {
    let { script } = options;
    const { connectConf } = options;
    if (isArray(script)) {
      script = script as Array<string>;
      if (connectConf.windows) {
        script = script.join("\r\n");
      } else {
        script = script.join("\n");
      }
    } else {
      if (connectConf.windows) {
        //@ts-ignore
        script = script.replaceAll("\n", "\r\n");
      }
    }
    return await this._call({
      connectConf,
      callable: async (conn: AsyncSsh2Client) => {
        return await conn.shell(script as string);
      },
    });
  }

  async _call<T = any>(options: { connectConf: SshAccess; callable: (conn: AsyncSsh2Client) => Promise<T> }): Promise<T> {
    const { connectConf, callable } = options;
    const conn = new AsyncSsh2Client(connectConf, this.logger);
    try {
      await conn.connect();
    } catch (e: any) {
      if (e.message?.indexOf("All configured authentication methods failed") > -1) {
        this.logger.error(e);
        throw new Error("Login failed. Check whether the username, password, or key is correct");
      }
      throw e;
    }
    let timeoutId = null;
    try {
      timeoutId = setTimeout(() => {
        this.logger.info("Execution timed out, disconnecting");
        conn.end();
      }, 1000 * (connectConf.timeout || 1800));
      return await callable(conn);
    } finally {
      clearTimeout(timeoutId);
      conn.end();
    }
  }

  async listDir(param: { connectConf: any; dir: string }) {
    return await this._call<any>({
      connectConf: param.connectConf,
      callable: async (conn: AsyncSsh2Client) => {
        const sftp = await conn.getSftp();
        return await conn.listDir({
          sftp,
          remotePath: param.dir,
        });
      },
    });
  }

  async download(param: { connectConf: any; filePath: string; savePath: string }) {
    return await this._call<any>({
      connectConf: param.connectConf,
      callable: async (conn: AsyncSsh2Client) => {
        const sftp = await conn.getSftp();
        return await conn.download({
          sftp,
          remotePath: param.filePath,
          savePath: param.savePath,
        });
      },
    });
  }
}
