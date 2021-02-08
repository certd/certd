import ssh2 from 'ssh2'
import path from 'path'
import { util } from '@certd/api'
import _ from 'lodash-es'
const logger = util.logger
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

  exec ({ connectConf, script }) {
    if (_.isArray(script)) {
      script = script.join('\n')
    }
    return new Promise((resolve, reject) => {
      this.connect({
        connectConf,
        onReady: (conn) => {
          conn.exec(script, (err, stream) => {
            if (err) {
              reject(err)
              return
            }
            let data = null
            stream.on('close', (code, signal) => {
              console.log(`[${connectConf.host}][close]:code:${code}, signal:${signal} `)
              if (code === 0) {
                resolve(data.toString())
              } else {
                reject(data.toString())
              }
              conn.end()
            }).on('data', (ret) => {
              console.log(`[${connectConf.host}][info]: ` + ret)
              data = ret
            }).stderr.on('data', (err) => {
              console.log(`[${connectConf.host}][error]: ` + err)
              data = err
              stream.close()
            })
          })
        }
      })
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
}
