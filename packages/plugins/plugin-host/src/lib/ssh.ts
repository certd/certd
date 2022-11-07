import ssh2 from "ssh2";
import path from "path";
import _ from "lodash";
import { Logger } from "log4js";
export class SshClient {
  logger: Logger;
  constructor(logger: Logger) {
    this.logger = logger;
  }
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
  uploadFiles(options: { connectConf: any; transports: any; sudo: boolean }) {
    const { connectConf, transports, sudo } = options;
    const conn = new ssh2.Client();

    return new Promise((resolve, reject) => {
      conn
        .on("ready", () => {
          this.logger.info("连接服务器成功");
          conn.sftp(async (err: Error, sftp: any) => {
            if (err) {
              throw err;
            }

            try {
              for (const transport of transports) {
                this.logger.info("上传文件：", JSON.stringify(transport));
                const sudoCmd = sudo ? "sudo" : "";
                await this.exec({ connectConf, script: `${sudoCmd} mkdir -p ${path.dirname(transport.remotePath)} ` });
                await this.fastPut({ sftp, ...transport });
              }
              resolve({});
            } catch (e) {
              reject(e);
            } finally {
              conn.end();
            }
          });
        })
        .connect(connectConf);
    });
  }

  exec(options: { connectConf: any; script: string | Array<string> }) {
    let { script } = options;
    const { connectConf } = options;
    if (_.isArray(script)) {
      script = script.join("\n");
    }
    this.logger.info("执行命令：", script);
    return new Promise((resolve, reject) => {
      this.connect({
        connectConf,
        onReady: (conn: any) => {
          conn.exec(script, (err: Error, stream: any) => {
            if (err) {
              reject(err);
              return;
            }
            let data: any = null;
            stream
              .on("close", (code: any, signal: any) => {
                this.logger.info(`[${connectConf.host}][close]:code:${code}`);
                data = data ? data.toString() : null;
                if (code === 0) {
                  resolve(data);
                } else {
                  reject(new Error(data));
                }
                conn.end();
              })
              .on("data", (ret: any) => {
                this.logger.info(`[${connectConf.host}][info]: ` + ret);
                data = ret;
              })
              .stderr.on("data", (err: Error) => {
                this.logger.info(`[${connectConf.host}][error]: ` + err);
                data = err;
              });
          });
        },
      });
    });
  }

  shell(options: { connectConf: any; script: string }) {
    const { connectConf, script } = options;
    return new Promise((resolve, reject) => {
      this.connect({
        connectConf,
        onReady: (conn: any) => {
          conn.shell((err: Error, stream: any) => {
            if (err) {
              reject(err);
              return;
            }
            const output: any = [];
            stream
              .on("close", () => {
                this.logger.info("Stream :: close");
                conn.end();
                resolve(output);
              })
              .on("data", (data: any) => {
                this.logger.info("" + data);
                output.push("" + data);
              });
            stream.end(script + "\nexit\n");
          });
        },
      });
    });
  }

  connect(options: { connectConf: any; onReady: any }) {
    const { connectConf, onReady } = options;
    const conn = new ssh2.Client();
    conn
      .on("ready", () => {
        this.logger.info("Client :: ready");
        onReady(conn);
      })
      .connect(connectConf);
    return conn;
  }

  fastPut(options: { sftp: any; localPath: string; remotePath: string }) {
    const { sftp, localPath, remotePath } = options;
    return new Promise((resolve, reject) => {
      sftp.fastPut(localPath, remotePath, (err: Error) => {
        if (err) {
          reject(err);
          return;
        }
        resolve({});
      });
    });
  }
}
