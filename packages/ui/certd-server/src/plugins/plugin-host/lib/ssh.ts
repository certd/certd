// @ts-ignore
import ssh2, { ConnectConfig } from 'ssh2';
import path from 'path';
import * as _ from 'lodash-es';
import { ILogger } from '@certd/pipeline';
import iconv from 'iconv-lite';
import { SshAccess } from '../access/index.js';
export class AsyncSsh2Client {
  conn: ssh2.Client;
  logger: ILogger;
  connConf: ssh2.ConnectConfig;
  windows = false;
  encoding: string;
  constructor(connConf: SshAccess, logger: ILogger) {
    this.connConf = connConf;
    this.logger = logger;
    this.windows = connConf.windows || false;
    this.encoding = connConf.encoding;
  }

  convert(buffer: Buffer) {
    if (this.encoding) {
      return iconv.decode(buffer, this.encoding);
    }
    return buffer.toString();
  }

  async connect() {
    this.logger.info(`开始连接，${this.connConf.host}:${this.connConf.port}`);
    return new Promise((resolve, reject) => {
      try {
        const conn = new ssh2.Client();
        conn
          .on('error', (err: any) => {
            this.logger.error('连接失败', err);
            reject(err);
          })
          .on('ready', () => {
            this.logger.info('连接成功');
            this.conn = conn;
            resolve(this.conn);
          })
          .connect(this.connConf);
      } catch (e) {
        reject(e);
      }
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
      this.logger.info(`开始上传：${localPath} => ${remotePath}`);
      sftp.fastPut(localPath, remotePath, (err: Error) => {
        if (err) {
          reject(err);
          return;
        }
        this.logger.info(`上传文件成功：${localPath} => ${remotePath}`);
        resolve({});
      });
    });
  }

  async exec(script: string) {
    if (!script) {
      this.logger.info('script 为空，取消执行');
      return;
    }
    return new Promise((resolve, reject) => {
      this.logger.info(`执行命令：[${this.connConf.host}][exec]: ` + script);
      this.conn.exec(script, (err: Error, stream: any) => {
        if (err) {
          reject(err);
          return;
        }
        let data = '';
        stream
          .on('close', (code: any, signal: any) => {
            this.logger.info(`[${this.connConf.host}][close]:code:${code}`);
            if (code === 0) {
              resolve(data);
            } else {
              reject(new Error(data));
            }
          })
          .on('data', (ret: Buffer) => {
            const out = this.convert(ret);
            data += out;
            this.logger.info(`[${this.connConf.host}][info]: ` + out.trimEnd());
          })
          .on('error', (err: any) => {
            reject(err);
            this.logger.error(err);
          })
          .stderr.on('data', (ret: Buffer) => {
            const err = this.convert(ret);
            data += err;
            this.logger.info(`[${this.connConf.host}][error]: ` + err.trimEnd());
          });
      });
    });
  }

  async shell(script: string | string[]): Promise<string[]> {
    return new Promise<any>((resolve, reject) => {
      this.logger.info(`执行shell脚本：[${this.connConf.host}][shell]: ` + script);
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
          .on('data', (ret: Buffer) => {
            const data = this.convert(ret);
            this.logger.info('' + data);
            output.push(data);
          })
          .stderr.on('data', (ret: Buffer) => {
            const data = this.convert(ret);
            output.push(data);
            this.logger.info(`[${this.connConf.host}][error]: ` + data);
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
  async uploadFiles(options: { connectConf: SshAccess; transports: any; mkdirs: boolean }) {
    const { connectConf, transports, mkdirs } = options;
    await this._call({
      connectConf,
      callable: async (conn: AsyncSsh2Client) => {
        const sftp = await conn.getSftp();
        this.logger.info('开始上传');
        for (const transport of transports) {
          if (mkdirs !== false) {
            const filePath = path.dirname(transport.remotePath);
            let mkdirCmd = `mkdir -p ${filePath} `;
            if (conn.windows) {
              if (filePath.indexOf('/') > -1) {
                this.logger.info('--------------------------');
                this.logger.info('请注意：windows下，文件目录分隔应该写成\\而不是/');
                this.logger.info('--------------------------');
              }
              const spec = await conn.exec('echo %COMSPEC%');
              if (spec.toString().trim() === '%COMSPEC%') {
                mkdirCmd = `New-Item -ItemType Directory -Path "${filePath}" -Force`;
              } else {
                mkdirCmd = `if not exist "${filePath}" mkdir "${filePath}"`;
              }
            }
            await conn.exec(mkdirCmd);
          }

          await conn.fastPut({ sftp, ...transport });
        }
        this.logger.info('文件全部上传成功');
      },
    });
  }

  async exec(options: { connectConf: SshAccess; script: string | Array<string> }) {
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

  async shell(options: { connectConf: SshAccess; script: string }): Promise<string[]> {
    const { connectConf, script } = options;
    return await this._call({
      connectConf,
      callable: async (conn: AsyncSsh2Client) => {
        return await conn.shell(script as string);
      },
    });
  }

  async _call(options: { connectConf: SshAccess; callable: any }): Promise<string[]> {
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
