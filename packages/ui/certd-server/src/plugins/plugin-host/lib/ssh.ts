// @ts-ignore
import ssh2, { ConnectConfig } from 'ssh2';
import path from 'path';
import _ from 'lodash';
import { ILogger } from '@certd/pipeline';

export class AsyncSsh2Client {
  conn: ssh2.Client;
  logger: ILogger;
  connConf: ssh2.ConnectConfig;
  constructor(connConf: ssh2.ConnectConfig, logger: ILogger) {
    this.connConf = connConf;
    this.logger = logger;
  }

  async connect() {
    this.logger.info(`开始连接，${this.connConf.host}:${this.connConf.port}`);
    return new Promise((resolve, reject) => {
      const conn = new ssh2.Client();
      conn
        .on('error', (err: any) => {
          reject(err);
        })
        .on('ready', () => {
          this.logger.info('连接成功');
          this.conn = conn;
          resolve(this.conn);
        })
        .connect(this.connConf);
    });
  }
  async getSftp() {
    return new Promise((resolve, reject) => {
      this.logger.info('获取sftp');
      this.conn.sftp((err: any, sftp: any) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(sftp);
      });
    });
  }

  async fastPut(options: { sftp: any; localPath: string; remotePath: string }) {
    const { sftp, localPath, remotePath } = options;
    return new Promise((resolve, reject) => {
      this.logger.info(`上传文件：${localPath} => ${remotePath}`);
      sftp.fastPut(localPath, remotePath, (err: Error) => {
        if (err) {
          reject(err);
          return;
        }
        resolve({});
      });
    });
  }

  async exec(script: string) {
    return new Promise((resolve, reject) => {
      this.logger.info(`执行脚本：[${this.connConf.host}][exec]: ` + script);
      this.conn.exec(script, (err: Error, stream: any) => {
        if (err) {
          reject(err);
          return;
        }
        let data: any = null;
        stream
          .on('close', (code: any, signal: any) => {
            this.logger.info(`[${this.connConf.host}][close]:code:${code}`);
            data = data ? data.toString() : null;
            if (code === 0) {
              resolve(data);
            } else {
              reject(new Error(data));
            }
          })
          .on('data', (ret: any) => {
            this.logger.info(`[${this.connConf.host}][info]: ` + ret);
            data = ret;
          })
          .stderr.on('data', (err: Error) => {
            this.logger.info(`[${this.connConf.host}][error]: ` + err);
            data = err;
          });
      });
    });
  }

  async shell(script: string | string[]): Promise<string[]> {
    return new Promise<any>((resolve, reject) => {
      this.logger.info(
        `执行shell脚本：[${this.connConf.host}][shell]: ` + script
      );
      this.conn.shell((err: Error, stream: any) => {
        if (err) {
          reject(err);
          return;
        }
        const output: string[] = [];
        stream
          .on('close', () => {
            this.logger.info('Stream :: close');
            resolve(output);
          })
          .on('data', (data: any) => {
            this.logger.info('' + data);
            output.push('' + data);
          });
        stream.end(script + '\nexit\n');
      });
    });
  }
  end() {
    if (this.conn) {
      this.conn.end();
    }
  }
}
export class SshClient {
  logger: ILogger;
  constructor(logger: ILogger) {
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
  async uploadFiles(options: { connectConf: ConnectConfig; transports: any }) {
    const { connectConf, transports } = options;
    await this._call({
      connectConf,
      callable: async (conn: AsyncSsh2Client) => {
        const sftp = await conn.getSftp();
        for (const transport of transports) {
          this.logger.info('上传文件：', JSON.stringify(transport));
          await conn.exec(`mkdir -p ${path.dirname(transport.remotePath)} `);
          await conn.fastPut({ sftp, ...transport });
        }
        this.logger.info('文件上传成功');
      },
    });
  }

  async exec(options: {
    connectConf: ConnectConfig;
    script: string | Array<string>;
  }) {
    let { script } = options;
    const { connectConf } = options;
    if (_.isArray(script)) {
      script = script as Array<string>;
      script = script.join('\n');
    }
    this.logger.info('执行命令：', script);
    return await this._call({
      connectConf,
      callable: async (conn: AsyncSsh2Client) => {
        return await conn.exec(script as string);
      },
    });
  }

  async shell(options: {
    connectConf: ConnectConfig;
    script: string;
  }): Promise<string[]> {
    const { connectConf, script } = options;
    return await this._call({
      connectConf,
      callable: async (conn: AsyncSsh2Client) => {
        return await conn.shell(script as string);
      },
    });
  }

  async _call(options: {
    connectConf: ConnectConfig;
    callable: any;
  }): Promise<string[]> {
    const { connectConf, callable } = options;
    const conn = new AsyncSsh2Client(connectConf, this.logger);
    await conn.connect();
    try {
      return await callable(conn);
    } finally {
      conn.end();
    }
  }
}
