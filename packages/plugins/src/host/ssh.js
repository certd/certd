import ssh2 from 'ssh2'
import logger from '../utils/util.log.js'
import path from 'path'
export class SshClient {
  /**
     *
     * @param connectConf
        {
          host: '192.168.100.100',
          port: 22,
          username: 'frylock',
          password: 'nodejsrules'
         }
     * @param transports
     */
  uploadFiles ({ connectConf, transports }) {
    const conn = new ssh2.Client()

    return new Promise((resolve, reject) => {
      conn.on('ready', () => {
        logger.info('连接服务器成功')
        conn.sftp(async (err, sftp) => {
          if (err) {
            throw err
          }

          try {
            for (const transport of transports) {
              logger.info('上传文件：', JSON.stringify(transport))
              await this.exec({ conn, cmd: 'mkdir ' + path.dirname(transport.remotePath) })
              await this.fastPut({ sftp, ...transport })
            }
            resolve()
          } catch (e) {
            reject(e)
          } finally {
            conn.end()
          }
        })
      }).connect(connectConf)
    })
  }

  shell ({ connectConf, script }) {
    return new Promise((resolve, reject) => {
      this.connect({
        connectConf,
        onReady: (conn) => {
          conn.shell((err, stream) => {
            if (err) {
              reject(err)
              return
            }
            const output = []
            stream.on('close', () => {
              logger.info('Stream :: close')
              conn.end()
              resolve(output)
            }).on('data', (data) => {
              logger.info('' + data)
              output.push('' + data)
            })
            stream.end(script + '\nexit\n')
          })
        }
      })
    })
  }

  connect ({ connectConf, onReady }) {
    const conn = new ssh2.Client()
    conn.on('ready', () => {
      console.log('Client :: ready')
      onReady(conn)
    }).connect(connectConf)
    return conn
  }

  fastPut ({ sftp, localPath, remotePath }) {
    return new Promise((resolve, reject) => {
      sftp.fastPut(localPath, remotePath, (err) => {
        if (err) {
          reject(err)
          return
        }
        resolve()
      })
    })
  }

  exec ({ conn, cmd }) {
    return new Promise((resolve, reject) => {
      conn.exec(cmd, (err, stream) => {
        if (err) {
          logger.error('执行命令出错', err)
          reject(err)
          // return conn.end()
        }

        stream.on('close', (code, signal) => {
          // logger.info('Stream :: close :: code: ' + code + ', signal: ' + signal)
          // conn.end()
          resolve()
        }).on('data', (data) => {
          logger.info('data', data.toString())
        })
      })
    })
  }
}
